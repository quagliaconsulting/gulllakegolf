import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/utils/auth';

const prisma = new PrismaClient();

// Define expected input structures
interface BaseAssignment {
  matchId: string;
}

interface StandardAssignment extends BaseAssignment {
  homePlayers: string[];
  awayPlayers: string[];
}

interface SinglesPairing {
  homePlayerId: string;
  awayPlayerId: string;
}

interface SinglesAssignment extends BaseAssignment {
  pairings: SinglesPairing[];
}

type AssignmentData = StandardAssignment | SinglesAssignment;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Extract token BEFORE calling verifyToken
  const authHeader = req.headers.authorization;
  let token: string | undefined = undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    // Optionally check cookies if needed, though middleware suggests header is primary
    // token = req.cookies?.token; 
  }

  // Verify the extracted token string
  if (!verifyToken(token, res)) { 
    return; // verifyToken already sent the response
  }

  if (req.method === 'POST') {
    const { assignments } = req.body;

    if (!Array.isArray(assignments)) {
      return res.status(400).json({ error: 'Invalid assignment data. Expected an array of assignments.' });
    }

    // Process each assignment
    const results = await Promise.all(assignments.map(async (assignment: AssignmentData) => {
      const { matchId } = assignment;

      try {
        // Verify that the match exists and include format
        const match = await prisma.match.findUnique({
          where: { id: matchId },
          include: {
            format: true, // Need format details for validation
            // playerToPlayerMatch flag might be relevant too, include it
          },
        });

        if (!match) {
          return { matchId, success: false, error: 'Match not found' };
        }

        // Validate and prepare pairings based on match format
        const { format } = match;
        // Check format name for primary determination
        const isSingles = format.formatName === 'Singles';
        // We are relying SOLELY on formatName === 'Singles' now, ignore playerToPlayerMatch for batch assign
        const isPairsFormat = ['Best Ball', 'Alternate Shot', 'Scramble', 'Chapman'].includes(format.formatName) && !isSingles;
        const isFourManTeam = format.isFourManTeam && !isSingles;
        

        let pairingsToCreate: Array<{ matchId: string; playerId: string; isHomeTeam: boolean; pairingGroup: number }> = [];

        // --- Input Validation and Pairing Preparation ---
        if (isSingles) {
          // Expects SinglesAssignment structure
          const singlesData = assignment as SinglesAssignment;
          if (!singlesData.pairings || !Array.isArray(singlesData.pairings)) { // Check if pairings array exists
             return { matchId, success: false, error: 'Invalid data structure for Singles format. Expected \'pairings\' array.' };
          }
          if (singlesData.pairings.length !== 2) {
            return { matchId, success: false, error: 'Singles format requires exactly 2 pairings (two 1v1 matches).' };
          }
          // Ensure each pairing has one home and one away player defined
          if (singlesData.pairings.some(p => !p.homePlayerId || !p.awayPlayerId)) {
             return { matchId, success: false, error: 'Each singles pairing must specify a homePlayerId and awayPlayerId.' };
          }

          // Create pairings with pairingGroup 1 and 2
          singlesData.pairings.forEach((pairing, index) => {
            const group = index + 1; // pairingGroup will be 1 and 2
            pairingsToCreate.push({ matchId, playerId: pairing.homePlayerId, isHomeTeam: true, pairingGroup: group });
            pairingsToCreate.push({ matchId, playerId: pairing.awayPlayerId, isHomeTeam: false, pairingGroup: group });
          });

        } else { // Handle Pairs and 4-Man Scramble (Standard Structure)
          // Expects StandardAssignment structure
          const standardData = assignment as StandardAssignment;
          if (!standardData.homePlayers || !Array.isArray(standardData.homePlayers) || !standardData.awayPlayers || !Array.isArray(standardData.awayPlayers)) {
             // This is the error you were seeing because the API thought the match wasn't Singles
             return { matchId, success: false, error: 'Invalid data structure for non-Singles format. Requires homePlayers and awayPlayers arrays.' };
          }

          let expectedPlayersPerTeam = 0;
          if (isFourManTeam) expectedPlayersPerTeam = 4;
          else if (isPairsFormat) expectedPlayersPerTeam = 2;
          
          if (expectedPlayersPerTeam === 0) {
              // This handles formats that are not Singles, not Pairs, and not 4-Man
              return { matchId, success: false, error: `Unsupported or ambiguous match format for assignment: ${format.formatName}` };
          }

          if (standardData.homePlayers.length !== expectedPlayersPerTeam || standardData.awayPlayers.length !== expectedPlayersPerTeam) {
            return {
              matchId,
              success: false,
              error: `${format.formatName} format requires exactly ${expectedPlayersPerTeam} players per team.`
            };
          }
          
          // Create pairings with pairingGroup 1 for non-Singles
          standardData.homePlayers.forEach(playerId => pairingsToCreate.push({ matchId, playerId, isHomeTeam: true, pairingGroup: 1 }));
          standardData.awayPlayers.forEach(playerId => pairingsToCreate.push({ matchId, playerId, isHomeTeam: false, pairingGroup: 1 }));
        }

        // --- Database Operations ---
        // Use a transaction to ensure atomicity
        await prisma.$transaction(async (tx) => {
          // Delete existing pairings for this match
          await tx.playerPairing.deleteMany({
            where: { matchId },
          });

          // Create new pairings
          await tx.playerPairing.createMany({
            data: pairingsToCreate,
          });
        });

        return { matchId, success: true };

      } catch (error) {
        console.error(`Error processing assignment for match ${matchId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to process assignment';
        return { matchId, success: false, error: errorMessage };
      }
    }));

    // Check overall success
    const allSuccessful = results.every(result => result.success);
    const statusCode = allSuccessful ? 200 : (results.some(r => r.success) ? 207 : 400); 

    return res.status(statusCode).json({
      message: allSuccessful ? 'All player assignments completed successfully' : 'Some player assignments may have failed',
      results,
    });

  } else {
    // Method not allowed
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}