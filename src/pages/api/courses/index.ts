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
    : req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Verify token with better error handling
    if (!verifyToken(token, res)) {
      return; // Response already sent by verifyToken
    }
    
    if (req.method === 'GET') {
      // Get all courses
      const courses = await prisma.course.findMany({
        include: {
          holes: true,
          tournament: {
            select: {
              name: true,
              year: true,
            },
          },
        },
      });
      
      return res.status(200).json(courses);
    } else if (req.method === 'POST') {
      // Create a new course
      const { name, tournamentId, holes } = req.body;

      if (!name || !tournamentId) {
        return res.status(400).json({ error: 'Name and tournament ID are required' });
      }

      try {
        // Create course with optional holes
        const course = await prisma.course.create({
          data: {
            name,
            tournamentId,
            ...(holes && Array.isArray(holes) && {
              holes: {
                createMany: {
                  data: holes.map((hole: any) => ({
                    number: hole.number,
                    par: hole.par,
                    handicap: hole.handicap,
                    distance: hole.distance,
                    isPar3: hole.par === 3
                  }))
                }
              }
            })
          },
          include: {
            tournament: true,
            holes: true
          }
        });
        
        return res.status(201).json(course);
      } catch (error) {
        console.error('Error creating course:', error);
        return res.status(500).json({ error: 'Failed to create course' });
      }
    }
    
    // For other methods, return 405 Method Not Allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}