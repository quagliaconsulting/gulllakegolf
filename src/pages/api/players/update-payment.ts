import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, PaymentType } from '@prisma/client';

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
    const { playerId, tournamentId, buyIn, ctp, skins } = req.body;

    if (!playerId || !tournamentId) {
      return res.status(400).json({ error: 'Player ID and Tournament ID are required' });
    }

    console.log('Received payment update request:', { 
      playerId, 
      tournamentId, 
      buyIn, 
      ctp, 
      skins 
    });

    // Get tournament to check if CTP and Skins are enabled
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Get existing player payments
    const existingPayments = await prisma.playerPayment.findMany({
      where: {
        playerId,
        tournamentId
      }
    });

    // Create a map of payment types to existing payment records
    const paymentMap: Record<string, any> = {};
    existingPayments.forEach(payment => {
      paymentMap[payment.type] = payment;
    });

    console.log('Existing payments:', existingPayments);

    // Manually handle buy-in to ensure we get a definitive result
    try {
      const existingBuyIn = paymentMap['BUY_IN'];
      
      if (buyIn) {
        // Create or update to PAID
        if (existingBuyIn) {
          await prisma.playerPayment.update({
            where: { id: existingBuyIn.id },
            data: { status: 'PAID' }
          });
          console.log(`Updated BUY_IN to PAID for player ${playerId}`);
        } else {
          await prisma.playerPayment.create({
            data: {
              playerId,
              tournamentId,
              type: 'BUY_IN',
              amount: tournament.buyIn || 0,
              status: 'PAID'
            }
          });
          console.log(`Created new PAID BUY_IN for player ${playerId}`);
        }
      } else {
        // If not paid, update to PENDING
        if (existingBuyIn) {
          await prisma.playerPayment.update({
            where: { id: existingBuyIn.id },
            data: { status: 'PENDING' }
          });
          console.log(`Updated BUY_IN to PENDING for player ${playerId}`);
        } else {
          // Create a PENDING record if none exists
          await prisma.playerPayment.create({
            data: {
              playerId,
              tournamentId,
              type: 'BUY_IN',
              amount: tournament.buyIn || 0,
              status: 'PENDING'
            }
          });
          console.log(`Created new PENDING BUY_IN for player ${playerId}`);
        }
      }
    } catch (error) {
      console.error('Error processing buy-in payment:', error);
    }

    // Handle CTP if tournament has it enabled
    if (tournament.hasCTP) {
      try {
        const existingCTP = paymentMap['CTP_ENTRY'];
        
        if (ctp) {
          // Create or update to PAID
          if (existingCTP) {
            await prisma.playerPayment.update({
              where: { id: existingCTP.id },
              data: { status: 'PAID' }
            });
            console.log(`Updated CTP_ENTRY to PAID for player ${playerId}`);
          } else {
            await prisma.playerPayment.create({
              data: {
                playerId,
                tournamentId,
                type: 'CTP_ENTRY',
                amount: tournament.ctpPrizeAmount || 0,
                status: 'PAID'
              }
            });
            console.log(`Created new PAID CTP_ENTRY for player ${playerId}`);
          }
        } else {
          // If not paid, update to PENDING
          if (existingCTP) {
            await prisma.playerPayment.update({
              where: { id: existingCTP.id },
              data: { status: 'PENDING' }
            });
            console.log(`Updated CTP_ENTRY to PENDING for player ${playerId}`);
          } else {
            // Create a PENDING record if none exists
            await prisma.playerPayment.create({
              data: {
                playerId,
                tournamentId,
                type: 'CTP_ENTRY',
                amount: tournament.ctpPrizeAmount || 0,
                status: 'PENDING'
              }
            });
            console.log(`Created new PENDING CTP_ENTRY for player ${playerId}`);
          }
        }
      } catch (error) {
        console.error('Error processing CTP payment:', error);
      }
    }

    // Handle Skins if tournament has it enabled
    if (tournament.hasSkins) {
      try {
        const existingSkins = paymentMap['SKINS_ENTRY'];
        
        if (skins) {
          // Create or update to PAID
          if (existingSkins) {
            await prisma.playerPayment.update({
              where: { id: existingSkins.id },
              data: { status: 'PAID' }
            });
            console.log(`Updated SKINS_ENTRY to PAID for player ${playerId}`);
          } else {
            await prisma.playerPayment.create({
              data: {
                playerId,
                tournamentId,
                type: 'SKINS_ENTRY',
                amount: tournament.skinsPrizeAmount || 0,
                status: 'PAID'
              }
            });
            console.log(`Created new PAID SKINS_ENTRY for player ${playerId}`);
          }
        } else {
          // If not paid, update to PENDING
          if (existingSkins) {
            await prisma.playerPayment.update({
              where: { id: existingSkins.id },
              data: { status: 'PENDING' }
            });
            console.log(`Updated SKINS_ENTRY to PENDING for player ${playerId}`);
          } else {
            // Create a PENDING record if none exists
            await prisma.playerPayment.create({
              data: {
                playerId,
                tournamentId,
                type: 'SKINS_ENTRY',
                amount: tournament.skinsPrizeAmount || 0,
                status: 'PENDING'
              }
            });
            console.log(`Created new PENDING SKINS_ENTRY for player ${playerId}`);
          }
        }
      } catch (error) {
        console.error('Error processing Skins payment:', error);
      }
    }

    // Fetch the updated payments to confirm what was saved
    const updatedPayments = await prisma.playerPayment.findMany({
      where: {
        playerId,
        tournamentId
      }
    });

    console.log('Updated payments after processing:', updatedPayments);

    // Format the response to match what the client expects
    const updatedStatus = {
      BUY_IN: updatedPayments.some(p => p.type === 'BUY_IN' && p.status === 'PAID'),
      CTP_ENTRY: updatedPayments.some(p => p.type === 'CTP_ENTRY' && p.status === 'PAID'),
      SKINS_ENTRY: updatedPayments.some(p => p.type === 'SKINS_ENTRY' && p.status === 'PAID')
    };

    console.log('Sending back updated status:', updatedStatus);

    return res.status(200).json({ 
      success: true,
      status: updatedStatus
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    return res.status(500).json({ error: 'Failed to update payment status' });
  }
}