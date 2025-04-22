import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '@/services/api/authService';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authenticate the request using the AuthService
  const user = await AuthService.requireAuth(req, res);
  if (!user) {
    return; // Response already sent by requireAuth
  }

  try {
    
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