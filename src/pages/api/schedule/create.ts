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
    
    if (req.method === 'POST') {
      const { tournamentId, day, date, matches } = req.body;
      
      // Validate required fields
      if (!tournamentId || !day || !date || !matches || !Array.isArray(matches)) {
        return res.status(400).json({ error: 'Tournament ID, day, date, and matches are required' });
      }
      
      // Check if tournament exists
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
      });
      
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      // Create schedule with proper UTC date handling
      // Parse the date and set to noon UTC to avoid timezone issues
      const scheduleDate = new Date(`${date}T12:00:00Z`);
      
      const schedule = await prisma.schedule.create({
        data: {
          tournamentId,
          day,
          date: scheduleDate,
        },
      });
      
      // Create matches for this schedule
      const createdMatches = [];
      
      for (const match of matches) {
        // Find or create the format multiplier
        let formatId;
        let isSinglesFormat = false;
        
        const existingFormat = await prisma.formatMultiplier.findFirst({
          where: {
            tournamentId,
            formatName: match.format,
          },
        });
        
        if (existingFormat) {
          formatId = existingFormat.id;
          isSinglesFormat = existingFormat.formatName === 'Singles';
        } else {
          // Default multipliers based on format
          let multiplier = 1.0; // Default for Best Ball and Singles
          let isFourManTeam = false;
          
          if (match.format === 'Singles') {
            multiplier = 1.0;
            isSinglesFormat = true;
          } else if (match.format === 'Scramble') {
            multiplier = 0.4;
          } else if (match.format === 'Alternate Shot') {
            multiplier = 0.7;
          } else if (match.format === 'Chapman') {
            multiplier = 0.6;
          } else if (match.format === '4-Man Team') {
            multiplier = 1.0;
            isFourManTeam = true;
          }
          
          const newFormat = await prisma.formatMultiplier.create({
            data: {
              tournamentId,
              formatName: match.format,
              multiplier,
              isFourManTeam
            },
          });
          
          formatId = newFormat.id;
        }

        // If no homeTeamId or awayTeamId provided, get the tournament's default teams
        let homeTeamId = match.homeTeamId;
        let awayTeamId = match.awayTeamId;
        
        if (!homeTeamId || !awayTeamId) {
          const teams = await prisma.team.findMany({
            where: { tournamentId },
            take: 2,
          });
          
          if (teams.length >= 2) {
            if (!homeTeamId) homeTeamId = teams[0].id;
            if (!awayTeamId) awayTeamId = teams[1].id;
          } else if (teams.length === 1) {
            // If only one team exists, use it for both (fallback scenario)
            if (!homeTeamId) homeTeamId = teams[0].id;
            if (!awayTeamId) awayTeamId = teams[0].id;
          }
        }
        
        // For Singles format, we need to create a placeholder match first
        // and later it will be used as a container for foursome grouping
        if (isSinglesFormat) {
          // Generate a unique foursome group ID
          const foursomeGroupId = `foursome_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          
          // Get team metadata to properly set home/away teams
          let homeTeamData = null;
          let awayTeamData = null;
          
          if (homeTeamId && awayTeamId) {
            [homeTeamData, awayTeamData] = await Promise.all([
              prisma.team.findUnique({ where: { id: homeTeamId } }),
              prisma.team.findUnique({ where: { id: awayTeamId } })
            ]);
          }
          
          // Create a placeholder match to represent the foursome
          const matchData: any = {
            tournamentId,
            scheduleId: schedule.id,
            formatId,
            courseId: match.courseId,
            startingHole: match.startingHole || 1,
            // Use UTC format for tee time to avoid timezone issues
            // Keep time as specified without timezone conversion
            teeTime: new Date(`${date}T${match.time}:00.000Z`),
            foursomeGroupId,
            playerToPlayerMatch: false // This is the container match
          };
          
          // Only include team IDs if they exist
          if (homeTeamId) matchData.homeTeamId = homeTeamId;
          if (awayTeamId) matchData.awayTeamId = awayTeamId;
          
          const createdMatch = await prisma.match.create({
            data: matchData,
            include: {
              format: true,
              course: true,
              homeTeam: true,
              awayTeam: true,
            },
          });
          
          createdMatches.push(createdMatch);
          
          // Note: We don't create individual player-vs-player matches yet
          // because we don't know which players will be assigned
          // The player assignment screen will handle creating the actual 1v1 matches
        } else {
          // For non-Singles formats, create match as usual
          // Get team metadata to properly set home/away teams
          let homeTeamData = null;
          let awayTeamData = null;
          
          if (homeTeamId && awayTeamId) {
            [homeTeamData, awayTeamData] = await Promise.all([
              prisma.team.findUnique({ where: { id: homeTeamId } }),
              prisma.team.findUnique({ where: { id: awayTeamId } })
            ]);
          }
          
          const matchData: any = {
            tournamentId,
            scheduleId: schedule.id,
            formatId,
            courseId: match.courseId,
            startingHole: match.startingHole || 1,
            // Use UTC format for tee time to avoid timezone issues
            // Keep time as specified without timezone conversion
            teeTime: new Date(`${date}T${match.time}:00.000Z`),
          };
          
          // Only include team IDs if they exist
          if (homeTeamId) matchData.homeTeamId = homeTeamId;
          if (awayTeamId) matchData.awayTeamId = awayTeamId;
          
          const createdMatch = await prisma.match.create({
            data: matchData,
            include: {
              format: true,
              course: true,
              homeTeam: true,
              awayTeam: true,
            },
          });
          
          createdMatches.push(createdMatch);
        }
      }
      
      return res.status(201).json({
        schedule,
        matches: createdMatches,
      });
    }
    
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}