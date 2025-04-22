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
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      statusCode: 401
    });
  }

  try {
    // Debug log for verification
    console.log('--- verifyToken --- ');
    console.log('Token string received (first 10): ', token.substring(0, 10));
    console.log('Token string received (last 10): ', token.substring(token.length - 10));
    console.log('JWT_SECRET from process.env:', process.env.JWT_SECRET);
    
    try {
      // Attempt verification
      const verified = jwt.verify(token, JWT_SECRET);
      console.log('Token verification successful.');
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError);
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication token',
        statusCode: 401
      });
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
      
      return res.status(200).json({
        success: true,
        data: formats,
        statusCode: 200
      });
    } else if (req.method === 'POST') {
      const { formatName, multiplier, isFourManTeam, tournamentId } = req.body;
      
      // Validate required fields
      if (!formatName || multiplier === undefined || !tournamentId) {
        return res.status(400).json({ 
          success: false,
          error: 'Format name, multiplier, and tournament ID are required',
          statusCode: 400
        });
      }
      
      // Check if tournament exists
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId }
      });
      
      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
          statusCode: 404
        });
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
      
      return res.status(201).json({
        success: true,
        data: format,
        statusCode: 201
      });
    } else if (req.method === 'PUT') {
      const { id, formatName, multiplier, isFourManTeam } = req.body;
      
      // Validate required fields
      if (!id || !formatName || multiplier === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Format ID, name, and multiplier are required',
          statusCode: 400
        });
      }
      
      // Check if format exists
      const existingFormat = await prisma.formatMultiplier.findUnique({
        where: { id }
      });
      
      if (!existingFormat) {
        return res.status(404).json({
          success: false,
          error: 'Format not found',
          statusCode: 404
        });
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
      
      return res.status(200).json({
        success: true,
        data: updatedFormat,
        statusCode: 200
      });
    } else if (req.method === 'DELETE') {
      const { id } = req.query;
      
      // Validate required fields
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Format ID is required',
          statusCode: 400
        });
      }
      
      // Check if format exists
      const existingFormat = await prisma.formatMultiplier.findUnique({
        where: { id: id as string }
      });
      
      if (!existingFormat) {
        return res.status(404).json({
          success: false,
          error: 'Format not found',
          statusCode: 404
        });
      }
      
      // Check if format is used in any matches
      const matches = await prisma.match.findMany({
        where: { formatId: id as string },
        take: 1
      });
      
      if (matches.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete format that is used in matches. Please remove all matches using this format first.',
          statusCode: 400
        });
      }
      
      // Delete format multiplier
      await prisma.formatMultiplier.delete({
        where: { id: id as string }
      });
      
      return res.status(200).json({
        success: true,
        data: { message: "Format deleted successfully" },
        statusCode: 200
      });
    }
    
    // Method not allowed
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      statusCode: 405
    });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      statusCode: 500
    });
  }
}