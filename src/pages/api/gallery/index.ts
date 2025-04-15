import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { verifyToken } from '@/utils/auth';

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
    // Verify token with better error handling
    if (!verifyToken(token, res)) {
      return; // Response already sent by verifyToken
    }
    
    if (req.method === 'GET') {
      const { tournamentId, year, tags } = req.query;
      
      // Build filters
      const filters: any = {};
      
      if (tournamentId) {
        filters.tournamentId = tournamentId as string;
      }
      
      if (year) {
        filters.year = parseInt(year as string);
      }
      
      // Fetch photos with filters
      const photos = await prisma.galleryPhoto.findMany({
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
      
      // Additional filtering for tags if provided
      let filteredPhotos = photos;
      if (tags) {
        const tagList = (tags as string).split(',').map(tag => tag.trim().toLowerCase());
        filteredPhotos = photos.filter(photo => {
          if (!photo.tags) return false;
          const photoTags = photo.tags.toLowerCase().split(',').map(tag => tag.trim());
          return tagList.some(tag => photoTags.includes(tag));
        });
      }
      
      return res.status(200).json(filteredPhotos);
    }
    
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}