import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/utils/auth';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid course ID' });
  }

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
      // Get course by ID
      const course = await prisma.course.findUnique({
        where: { id },
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
      
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      
      return res.status(200).json(course);
    } else if (req.method === 'PUT') {
      // Update course
      const { name, tournamentId, holes } = req.body;
      
      // Validate required fields
      if (!name) {
        return res.status(400).json({ error: 'Course name is required' });
      }
      
      // Check if course exists
      const existingCourse = await prisma.course.findUnique({
        where: { id },
        include: { holes: true }
      });
      
      if (!existingCourse) {
        return res.status(404).json({ error: 'Course not found' });
      }
      
      // Update course data
      const updatedCourse = await prisma.course.update({
        where: { id },
        data: {
          name,
          tournamentId: tournamentId || existingCourse.tournamentId
        },
        include: {
          tournament: true,
          holes: true
        }
      });
      
      // Update holes if provided
      if (holes && Array.isArray(holes)) {
        // Delete existing holes
        await prisma.hole.deleteMany({
          where: { courseId: id }
        });
        
        // Create new holes
        await prisma.hole.createMany({
          data: holes.map((hole: any) => ({
            courseId: id,
            number: hole.number,
            par: hole.par,
            handicap: hole.handicap,
            distance: hole.distance,
            isPar3: hole.par === 3
          }))
        });
        
        // Refetch course with updated holes
        const courseWithHoles = await prisma.course.findUnique({
          where: { id },
          include: {
            tournament: true,
            holes: true
          }
        });
        
        return res.status(200).json(courseWithHoles);
      }
      
      return res.status(200).json(updatedCourse);
    } else if (req.method === 'DELETE') {
      // Check if course exists
      const existingCourse = await prisma.course.findUnique({
        where: { id }
      });
      
      if (!existingCourse) {
        return res.status(404).json({ error: 'Course not found' });
      }
      
      // Delete all holes associated with the course
      await prisma.hole.deleteMany({
        where: { courseId: id }
      });
      
      // Delete the course
      await prisma.course.delete({
        where: { id }
      });
      
      return res.status(200).json({ message: 'Course deleted successfully' });
    }
    
    // For other methods, return 405 Method Not Allowed
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}