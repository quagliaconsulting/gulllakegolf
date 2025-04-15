import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid team ID' });
  }
  
  if (req.method === 'GET') {
    try {
      const team = await prisma.team.findUnique({
        where: { id },
        include: {
          tournament: true,
          players: {
            orderBy: {
              name: 'asc'
            }
          },
        }
      });
      
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }
      
      res.status(200).json({ team });
    } catch (error) {
      console.error('Error fetching team:', error);
      res.status(500).json({ error: 'Failed to fetch team' });
    }
  } else if (req.method === 'PUT') {
    try {
      const updateData = req.body;
      
      const team = await prisma.team.update({
        where: { id },
        data: {
          name: updateData.name,
        },
        include: {
          tournament: true,
        }
      });
      
      res.status(200).json({ team });
    } catch (error) {
      console.error('Error updating team:', error);
      res.status(500).json({ error: 'Failed to update team' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Note: this will fail if there are matches referencing this team
      // In a real app, you'd need to handle that case
      await prisma.team.delete({
        where: { id }
      });
      
      res.status(200).json({ message: 'Team deleted successfully' });
    } catch (error) {
      console.error('Error deleting team:', error);
      res.status(500).json({ error: 'Failed to delete team' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}