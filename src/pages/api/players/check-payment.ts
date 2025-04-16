import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, PaymentType } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { playerId, tournamentId } = req.query;

    if (!playerId || !tournamentId || typeof playerId !== 'string' || typeof tournamentId !== 'string') {
      return res.status(400).json({ error: 'Player ID and Tournament ID are required' });
    }

    console.log(`Checking payment status for player ${playerId} in tournament ${tournamentId}`);

    // Get all payment records for this player and tournament
    const payments = await prisma.playerPayment.findMany({
      where: {
        playerId,
        tournamentId
      }
    });

    // Create payment status object
    const paymentStatus: Record<string, boolean> = {
      BUY_IN: false,
      CTP_ENTRY: false,
      SKINS_ENTRY: false,
      PRIZE_PAYOUT: false,
      CTP_PAYOUT: false,
      SKINS_PAYOUT: false,
      OTHER: false
    };

    // Process each payment
    payments.forEach(payment => {
      // Only PAID status is considered true
      if (payment.type in paymentStatus) {
        paymentStatus[payment.type] = payment.status === 'PAID';
      }
    });

    console.log('Payment status:', paymentStatus);

    return res.status(200).json({ 
      playerId,
      tournamentId,
      paymentStatus
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    return res.status(500).json({ error: 'Failed to check payment status' });
  }
}