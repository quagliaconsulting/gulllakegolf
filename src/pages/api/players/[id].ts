import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid player ID' });
  }
  
  if (req.method === 'GET') {
    try {
      const player = await prisma.player.findUnique({
        where: { id },
        include: {
          team: true,
          accommodation: true
        }
      });
      
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }
      
      res.status(200).json({ player });
    } catch (error) {
      console.error('Error fetching player:', error);
      res.status(500).json({ error: 'Failed to fetch player' });
    }
  } else if (req.method === 'PUT') {
    try {
      const updateData = req.body;
      
      const player = await prisma.player.update({
        where: { id },
        data: {
          name: updateData.name,
          handicapIndex: parseFloat(updateData.handicapIndex),
          teamId: updateData.teamId,
          accommodationId: updateData.accommodationId || undefined
        }
      });
      
      res.status(200).json({ player });
    } catch (error) {
      console.error('Error updating player:', error);
      res.status(500).json({ error: 'Failed to update player' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.player.delete({
        where: { id }
      });
      
      res.status(200).json({ message: 'Player deleted successfully' });
    } catch (error) {
      console.error('Error deleting player:', error);
      res.status(500).json({ error: 'Failed to delete player' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}