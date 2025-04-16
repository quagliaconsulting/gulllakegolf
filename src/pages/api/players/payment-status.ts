import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { playerId, tournamentId, buyIn, ctp, skins, notes } = req.body;

    if (!playerId || !tournamentId) {
      return res.status(400).json({ error: 'Player ID and Tournament ID are required' });
    }

    // Get player to access their info
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        team: true
      }
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Log the incoming request for debugging
    console.log('Payment status update request:', { 
      playerId, 
      tournamentId, 
      buyIn: !!buyIn, 
      ctp: !!ctp, 
      skins: !!skins 
    });

    // Handle Buy-In status
    await handlePaymentType(playerId, tournamentId, 'BUY_IN', !!buyIn, notes);
    
    // Handle CTP Entry status if tournament has CTP enabled
    await handlePaymentType(playerId, tournamentId, 'CTP_ENTRY', !!ctp, notes);
    
    // Handle Skins Entry status if tournament has Skins enabled
    await handlePaymentType(playerId, tournamentId, 'SKINS_ENTRY', !!skins, notes);
    
    // Store payment metadata in player's team metadata
    if (player.team) {
      try {
        // Get existing metadata or initialize empty object
        const existingMetadata = player.team.metadata ? player.team.metadata : {};
        
        // Update payment data in metadata
        const paymentData = {
          ...(existingMetadata as any).payments || {},
          [playerId]: {
            buyIn: !!buyIn,
            ctp: !!ctp,
            skins: !!skins,
            lastUpdated: new Date().toISOString(),
          }
        };
        
        // Update team with new metadata
        await prisma.team.update({
          where: { id: player.teamId },
          data: {
            metadata: {
              ...(existingMetadata as any),
              payments: paymentData
            }
          }
        });
      } catch (error) {
        console.error('Error updating team metadata:', error);
        // Continue even if metadata update fails
      }
    }
    
    // Get updated payment status from database to send back
    const updatedPayments = await prisma.playerPayment.findMany({
      where: {
        playerId,
        tournamentId
      }
    });
    
    // Format updated payments for the response
    const formattedPayments = updatedPayments.reduce((acc, payment) => {
      acc[payment.type] = payment.status === 'PAID';
      return acc;
    }, {} as Record<string, boolean>);
    
    return res.status(200).json({ 
      success: true,
      payments: formattedPayments
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    return res.status(500).json({ error: 'Failed to update payment status' });
  }
}

async function handlePaymentType(
  playerId: string, 
  tournamentId: string, 
  type: 'BUY_IN' | 'CTP_ENTRY' | 'SKINS_ENTRY', 
  isPaid: boolean,
  notes?: string
) {
  console.log(`Handling payment for ${playerId}, type: ${type}, isPaid: ${isPaid}`);
  
  try {
    // Check if a payment record exists
    const existingPayment = await prisma.playerPayment.findFirst({
      where: {
        playerId,
        tournamentId,
        type,
      },
    });

    if (isPaid) {
      // If paid and record exists, update it
      if (existingPayment) {
        await prisma.playerPayment.update({
          where: { id: existingPayment.id },
          data: { 
            status: 'PAID',
            notes: notes || existingPayment.notes
          },
        });
        console.log(`Updated existing payment to PAID: ${existingPayment.id}`);
      } 
      // If paid and no record exists, create it
      else {
        // Get tournament details to know the amount
        const tournament = await prisma.tournament.findUnique({
          where: { id: tournamentId },
        });

        let amount = 0;
        if (type === 'BUY_IN' && tournament?.buyIn) {
          amount = tournament.buyIn;
        } else if (type === 'CTP_ENTRY' && tournament?.ctpPrizeAmount) {
          amount = tournament.ctpPrizeAmount;
        } else if (type === 'SKINS_ENTRY' && tournament?.skinsPrizeAmount) {
          amount = tournament.skinsPrizeAmount;
        }

        const newPayment = await prisma.playerPayment.create({
          data: {
            playerId,
            tournamentId,
            type,
            amount,
            status: 'PAID',
            notes: notes || null,
          },
        });
        console.log(`Created new PAID payment: ${newPayment.id}`);
      }
    } else {
      // If not paid and record exists, update to pending
      if (existingPayment) {
        await prisma.playerPayment.update({
          where: { id: existingPayment.id },
          data: { 
            status: 'PENDING',
            notes: notes || existingPayment.notes
          },
        });
        console.log(`Updated existing payment to PENDING: ${existingPayment.id}`);
      } else {
        // If the user wants to explicitly set as unpaid, create a PENDING record
        const tournament = await prisma.tournament.findUnique({
          where: { id: tournamentId },
        });

        let amount = 0;
        if (type === 'BUY_IN' && tournament?.buyIn) {
          amount = tournament.buyIn;
        } else if (type === 'CTP_ENTRY' && tournament?.ctpPrizeAmount) {
          amount = tournament.ctpPrizeAmount;
        } else if (type === 'SKINS_ENTRY' && tournament?.skinsPrizeAmount) {
          amount = tournament.skinsPrizeAmount;
        }

        const newPayment = await prisma.playerPayment.create({
          data: {
            playerId,
            tournamentId,
            type,
            amount,
            status: 'PENDING',
            notes: notes || null,
          },
        });
        console.log(`Created new PENDING payment: ${newPayment.id}`);
      }
    }
  } catch (error) {
    console.error(`Error handling payment type ${type}:`, error);
    throw error;
  }
}