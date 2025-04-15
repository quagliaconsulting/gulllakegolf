import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const players = await prisma.player.findMany({
        include: {
          team: true,
          accommodation: true
        },
        orderBy: {
          name: 'asc'
        }
      });
      
      res.status(200).json({ players });
    } catch (error) {
      console.error('Error fetching players:', error);
      res.status(500).json({ error: 'Failed to fetch players' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, handicapIndex, teamId, accommodationId } = req.body;
      
      const player = await prisma.player.create({
        data: {
          name,
          handicapIndex: parseFloat(handicapIndex),
          teamId,
          accommodationId: accommodationId || undefined
        }
      });
      
      res.status(201).json({ player });
    } catch (error) {
      console.error('Error creating player:', error);
      res.status(500).json({ error: 'Failed to create player' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}