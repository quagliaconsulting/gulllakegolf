import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify JWT token
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Invalid token:', error);
    return res.status(401).json({ error: 'Invalid authentication token' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid team ID' });
  }

  if (req.method === 'GET') {
    try {
      const team = await prisma.team.findUnique({
        where: { id },
        include: {
          players: true,
          tournament: true,
        },
      });

      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      return res.status(200).json({ team });
    } catch (error) {
      console.error('Error fetching team:', error);
      return res.status(500).json({ error: 'Failed to fetch team' });
    }
  } else if (req.method === 'PUT') {
    try {
      const updateData = req.body;
      
      // Check if isHomeTeam was provided
      const teamData: any = {
        name: updateData.name,
      };
      
      if (updateData.isHomeTeam !== undefined) {
        // Handle the home team designation here with proper Prisma JSON handling
        teamData.metadata = {
          isHomeTeam: updateData.isHomeTeam
        };
      }
      
      const team = await prisma.team.update({
        where: { id },
        data: teamData,
        include: {
          tournament: true,
          players: true,
        }
      });
      
      return res.status(200).json({ team });
    } catch (error) {
      console.error('Error updating team:', error);
      return res.status(500).json({ error: 'Failed to update team' });
    }
  } else if (req.method === 'DELETE') {
    try {
      // First check if this team is used in any matches
      const matchesUsingTeam = await prisma.match.findMany({
        where: {
          OR: [
            { homeTeamId: id },
            { awayTeamId: id }
          ]
        }
      });

      if (matchesUsingTeam.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete team because it is used in match schedules' 
        });
      }

      // Delete the team (players will cascade delete)
      await prisma.team.delete({
        where: { id },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting team:', error);
      return res.status(500).json({ error: 'Failed to delete team' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}