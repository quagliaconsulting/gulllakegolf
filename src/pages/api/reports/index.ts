import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '@/services/api/authService';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authenticate using AuthService
  const user = await AuthService.requireAuth(req, res);
  if (!user) {
    return; // Response already sent by requireAuth
  }

  try {
    
    if (req.method === 'GET') {
      const { tournamentId, type, format } = req.query;
      
      // Build filters
      const filters: any = {};
      
      if (tournamentId) {
        filters.tournamentId = tournamentId as string;
      }
      
      if (type) {
        filters.type = type as string;
      }
      
      if (format) {
        filters.format = format as string;
      }
      
      // Fetch reports with filters
      const reports = await prisma.report.findMany({
        where: filters,
        include: {
          tournament: {
            select: {
              name: true,
              year: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      return res.status(200).json(reports);
    }
    
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}