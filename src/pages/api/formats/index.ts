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
      const { tournamentId } = req.query;
      
      // Get query parameters
      const filters: any = {};
      if (tournamentId) {
        filters.tournamentId = tournamentId as string;
      }
      
      // Fetch format multipliers from database
      const formats = await prisma.formatMultiplier.findMany({
        where: filters,
        orderBy: {
          formatName: 'asc'
        }
      });
      
      return res.status(200).json(formats);
    } else if (req.method === 'POST') {
      const { formatName, multiplier, isFourManTeam, tournamentId } = req.body;
      
      // Validate required fields
      if (!formatName || multiplier === undefined || !tournamentId) {
        return res.status(400).json({ error: 'Format name, multiplier, and tournament ID are required' });
      }
      
      // Check if tournament exists
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId }
      });
      
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      // Create new format multiplier
      const format = await prisma.formatMultiplier.create({
        data: {
          formatName,
          multiplier: parseFloat(multiplier.toString()),
          isFourManTeam: isFourManTeam === true || isFourManTeam === 'true',
          tournamentId
        }
      });
      
      return res.status(201).json(format);
    } else if (req.method === 'PUT') {
      const { id, formatName, multiplier, isFourManTeam } = req.body;
      
      // Validate required fields
      if (!id || !formatName || multiplier === undefined) {
        return res.status(400).json({ error: 'Format ID, name, and multiplier are required' });
      }
      
      // Check if format exists
      const existingFormat = await prisma.formatMultiplier.findUnique({
        where: { id }
      });
      
      if (!existingFormat) {
        return res.status(404).json({ error: 'Format not found' });
      }
      
      // Update format multiplier
      const updatedFormat = await prisma.formatMultiplier.update({
        where: { id },
        data: {
          formatName,
          multiplier: parseFloat(multiplier.toString()),
          isFourManTeam: isFourManTeam === true || isFourManTeam === 'true'
        }
      });
      
      return res.status(200).json(updatedFormat);
    } else if (req.method === 'DELETE') {
      const { id } = req.query;
      
      // Validate required fields
      if (!id) {
        return res.status(400).json({ error: 'Format ID is required' });
      }
      
      // Check if format exists
      const existingFormat = await prisma.formatMultiplier.findUnique({
        where: { id: id as string }
      });
      
      if (!existingFormat) {
        return res.status(404).json({ error: 'Format not found' });
      }
      
      // Check if format is used in any matches
      const matches = await prisma.match.findMany({
        where: { formatId: id as string },
        take: 1
      });
      
      if (matches.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete format that is used in matches. Please remove all matches using this format first.' 
        });
      }
      
      // Delete format multiplier
      await prisma.formatMultiplier.delete({
        where: { id: id as string }
      });
      
      return res.status(204).send(null);
    }
    
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}