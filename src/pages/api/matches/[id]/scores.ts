import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
// Import the utility functions
import {
  calculateTeamHandicap,
  calculateNetScore,
  determineHoleWinner 
} from '../../../../utils/handicap';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid match ID' });
  }
  
  if (req.method === 'GET') {
    try {
      // Fetch match scores
      const match = await prisma.match.findUnique({
        where: { id },
        include: {
          homeTeam: true,
          awayTeam: true,
          format: true,
          course: {
            include: {
              holes: {
                orderBy: {
                  number: 'asc',
                }
              }
            }
          },
          holeResults: {
            include: {
              hole: true,
            },
            orderBy: {
              hole: {
                number: 'asc',
              }
            }
          },
          playerPairings: {
            include: {
              player: true,
            }
          },
          points: true,
        }
      });
      
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }
      
      // Get players
      const homePlayers = match.playerPairings
        .filter(p => p.isHomeTeam)
        .map(p => p.player);
        
      const awayPlayers = match.playerPairings
        .filter(p => !p.isHomeTeam)
        .map(p => p.player);
        
      // Calculate team handicaps using imported utility
      const homeTeamHandicap = calculateTeamHandicap(
        homePlayers.map(p => p.handicapIndex),
        match.format.multiplier, // Pass multiplier directly
        match.format.isFourManTeam || false // Pass isFourManTeam flag
      );
      
      const awayTeamHandicap = calculateTeamHandicap(
        awayPlayers.map(p => p.handicapIndex),
        match.format.multiplier, // Pass multiplier directly
        match.format.isFourManTeam || false // Pass isFourManTeam flag
      );
      
      // Filter holes based on the match's startingHole
      // If startingHole is 1, we're playing front 9
      // If startingHole is 10, we're playing back 9
      const relevantHoles = match.course.holes.filter(hole => {
        // For matches starting on hole 1, include only front 9
        if (match.startingHole === 1) {
          return hole.number <= 9;
        }
        // For matches starting on hole 10, include only back 9 
        else if (match.startingHole === 10) {
          return hole.number > 9;
        }
        // For any other startingHole value, include all holes
        return true;
      });
      
      // Format hole results
      const holes = relevantHoles.map(hole => {
        const holeResult = match.holeResults.find(r => r.holeId === hole.id);
        
        // Determine winner based on saved net scores using the helper (or direct comparison)
        const winner = getWinner(holeResult); // Keep using local getWinner for reading saved state
        
        return {
          id: hole.id, // Include hole ID
          number: hole.number,
          par: hole.par,
          handicap: hole.handicap,
          isPar3: hole.isPar3, // Include isPar3 flag
          homeGross: holeResult?.homeTeamGrossScore ?? null,
          awayGross: holeResult?.awayTeamGrossScore ?? null,
          homeNet: holeResult?.homeTeamNetScore ?? null,
          awayNet: holeResult?.awayTeamNetScore ?? null,
          winner, // Use the result from getWinner
        };
      });
      
      // Return formatted match with scores
      // Add foursome group info if this is part of a foursome
      let foursomeMatches = null;
      
      if (match.playerToPlayerMatch && match.foursomeGroupId) {
        // Find other matches in the same foursome
        const otherMatches = await prisma.match.findMany({
          where: {
            foursomeGroupId: match.foursomeGroupId,
            id: { not: match.id }
          },
          include: {
            playerPairings: {
              include: {
                player: true
              }
            },
            points: true
          }
        });
        
        // Format the other matches for display
        foursomeMatches = otherMatches.map(m => {
          const homePlayers = m.playerPairings.filter(p => p.isHomeTeam).map(p => p.player);
          const awayPlayers = m.playerPairings.filter(p => !p.isHomeTeam).map(p => p.player);
          
          // Determine match result
          let result = null;
          if (m.points) {
            if (m.points.homeTeamPoints > m.points.awayTeamPoints) {
              result = `${homePlayers[0]?.name || 'Home'} wins ${m.points.homeTeamPoints}-${m.points.awayTeamPoints}`;
            } else if (m.points.awayTeamPoints > m.points.homeTeamPoints) {
              result = `${awayPlayers[0]?.name || 'Away'} wins ${m.points.awayTeamPoints}-${m.points.homeTeamPoints}`;
            } else if (m.points.homeTeamPoints === m.points.awayTeamPoints) {
              result = 'Match tied';
            }
          }
          
          return {
            id: m.id,
            homePlayers,
            awayPlayers,
            result
          };
        });
      }
      
      // Assert Team metadata type for isHomeTeam access
      const homeTeamIsReal = typeof match.homeTeam?.metadata === 'object' && match.homeTeam.metadata !== null && 'isHomeTeam' in match.homeTeam.metadata ? !!match.homeTeam.metadata.isHomeTeam : false;
      const awayTeamIsReal = typeof match.awayTeam?.metadata === 'object' && match.awayTeam.metadata !== null && 'isHomeTeam' in match.awayTeam.metadata ? !!match.awayTeam.metadata.isHomeTeam : false;

      const result = {
        id: match.id,
        format: match.format.formatName,
        formatMultiplier: match.format.multiplier,
        isFourManTeam: match.format.isFourManTeam || false,
        playerToPlayerMatch: match.playerToPlayerMatch || false,
        foursomeGroupId: match.foursomeGroupId || null,
        homeTeam: match.homeTeam?.name || 'Team 1',
        homeTeamId: match.homeTeamId,
        homeTeamIsReal, // Use checked value
        awayTeam: match.awayTeam?.name || 'Team 2',
        awayTeamId: match.awayTeamId,
        awayTeamIsReal, // Use checked value
        time: match.teeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' }),
        course: match.course.name,
        startingHole: match.startingHole,
        holeCount: (match as any).holes ?? 18, // Assuming match.holes might exist (e.g., 9 or 18)
        homePlayers,
        awayPlayers,
        holes,
        homeTeamHandicap,
        awayTeamHandicap,
        points: match.points,
        foursomeMatches
      };
      
      res.status(200).json({ match: result });
    } catch (error) {
      console.error('Error fetching match scores:', error);
      res.status(500).json({ error: 'Failed to fetch match scores' });
    }
  } else if (req.method === 'POST') {
    try {
      const { holeResults } = req.body;
      const holes = holeResults || [];
      
      if (!Array.isArray(holes)) {
        return res.status(400).json({ error: 'Invalid hole data format' });
      }
      
      // Get match details
      const match = await prisma.match.findUnique({
        where: { id },
        include: {
          format: true,
          course: {
            include: {
              holes: true,
            }
          },
          playerPairings: {
            include: {
              player: true,
            }
          },
        }
      });
      
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }
      
      // Calculate team handicaps using imported utility
      const homePlayers = match.playerPairings
        .filter(p => p.isHomeTeam)
        .map(p => p.player);
        
      const awayPlayers = match.playerPairings
        .filter(p => !p.isHomeTeam)
        .map(p => p.player);
        
      const homeTeamHandicap = calculateTeamHandicap(
        homePlayers.map(p => p.handicapIndex),
        match.format.multiplier, // Pass multiplier directly
        match.format.isFourManTeam || false // Pass isFourManTeam flag
      );
      
      const awayTeamHandicap = calculateTeamHandicap(
        awayPlayers.map(p => p.handicapIndex),
        match.format.multiplier, // Pass multiplier directly
        match.format.isFourManTeam || false // Pass isFourManTeam flag
      );
      
      // Process each hole score
      const updates = [];
      for (const holeData of holes) {
        // Use holeData.holeNumber consistently
        const holeNumber = holeData.holeNumber;
        if (!holeNumber || !match.course.holes.some(h => h.number === holeNumber)) {
          console.warn(`Skipping invalid hole number: ${holeNumber}`);
          continue;
        }
        
        const hole = match.course.holes.find(h => h.number === holeNumber);
        
        if (!hole) {
           console.warn(`Could not find hole definition for number: ${holeNumber}`);
          continue;
        }
        
        // Convert empty strings or undefined gross scores to null
        const homeGross = holeData.homeGross === '' || holeData.homeGross === undefined ? null : Number(holeData.homeGross);
        const awayGross = holeData.awayGross === '' || holeData.awayGross === undefined ? null : Number(holeData.awayGross);

        // Ensure gross scores are valid numbers if not null
        if ((homeGross !== null && isNaN(homeGross)) || (awayGross !== null && isNaN(awayGross))) {
            console.warn(`Invalid score input for hole ${holeNumber}. Skipping.`);
            continue;
        }

        // Calculate net scores using imported utility
        const homeNetScore = homeGross !== null ? calculateNetScore(
          homeGross, 
          homeTeamHandicap, 
          hole.handicap, 
          match.format.isFourManTeam || false
        ) : null;
        const awayNetScore = awayGross !== null ? calculateNetScore(
          awayGross, 
          awayTeamHandicap, 
          hole.handicap, 
          match.format.isFourManTeam || false
        ) : null;
        
        // Determine winner using imported utility
        // Ensure net scores are numbers before determining winner
        const winner = (homeNetScore !== null && awayNetScore !== null) 
                       ? determineHoleWinner(homeNetScore, awayNetScore) 
                       : null;
        
        // Update or create hole result
        updates.push(
          prisma.holeResult.upsert({
            where: {
              matchId_holeId: {
                matchId: id,
                holeId: hole.id,
              }
            },
            update: {
              homeTeamGrossScore: homeGross,
              awayTeamGrossScore: awayGross,
              homeTeamNetScore: homeNetScore,
              awayTeamNetScore: awayNetScore,
              winnerTeamId: winner === 'home' ? match.homeTeamId : 
                            winner === 'away' ? match.awayTeamId : null,
            },
            create: {
              matchId: id,
              holeId: hole.id,
              homeTeamGrossScore: homeGross,
              awayTeamGrossScore: awayGross,
              homeTeamNetScore: homeNetScore,
              awayTeamNetScore: awayNetScore,
              winnerTeamId: winner === 'home' ? match.homeTeamId : 
                            winner === 'away' ? match.awayTeamId : null,
            }
          })
        );
      }
      
      // Execute all updates
      if (updates.length > 0) {
        await prisma.$transaction(updates);
      }
      
      // Calculate and update match points
      await updateMatchPoints(id);
      
      res.status(200).json({ message: 'Scores updated successfully' });
    } catch (error) {
      console.error('Error updating match scores:', error);
      res.status(500).json({ error: 'Failed to update match scores' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Keep local getWinner for reading saved state in GET handler
function getWinner(holeResult: any): string | null {
  if (!holeResult) return null;
  // Return 'tie' if scores are equal, otherwise determine winner based on net scores
  if (holeResult.homeTeamNetScore === null || holeResult.awayTeamNetScore === null) return null;
  if (holeResult.homeTeamNetScore === holeResult.awayTeamNetScore) return 'tie';
  return holeResult.homeTeamNetScore < holeResult.awayTeamNetScore ? 'home' : 'away';
}

async function updateMatchPoints(matchId: string) {
  // Disconnect Prisma client if passed in or create new one
  const prismaInstance = prisma || new PrismaClient();
  
  try {
    // Get all hole results for this match
    const holeResults = await prismaInstance.holeResult.findMany({
      where: { matchId }
    });

    // Fetch the match format to get points data
    const match = await prismaInstance.match.findUnique({
      where: { id: matchId },
      include: {
        format: {
          select: { points: true, halfPoints: true }
        }
      }
    });

    if (!match || !match.format) {
      console.error(`Cannot update points: Match format not found for matchId: ${matchId}`);
      return;
    }

    const pointsPerWin = match.format.points ?? 1.0;
    const pointsPerTie = match.format.halfPoints ?? pointsPerWin / 2.0; // Default half points if not set
    
    // Count points for each team
    let homePoints = 0;
    let awayPoints = 0;
    
    holeResults.forEach(result => {
      if (result.homeTeamNetScore !== null && result.awayTeamNetScore !== null) {
        if (result.homeTeamNetScore < result.awayTeamNetScore) {
          homePoints += pointsPerWin;
        } else if (result.awayTeamNetScore < result.homeTeamNetScore) {
          awayPoints += pointsPerWin;
        } else {
          // Scores are tied
          homePoints += pointsPerTie;
          awayPoints += pointsPerTie;
        }
      }
    });
    
    // Update match points
    await prismaInstance.matchPoints.upsert({
      where: { matchId },
      update: {
        homeTeamPoints: homePoints,
        awayTeamPoints: awayPoints,
      },
      create: {
        matchId,
        homeTeamPoints: homePoints,
        awayTeamPoints: awayPoints,
      }
    });
  } catch (error) {
      console.error(`Error updating match points for match ${matchId}:`, error);
  } finally {
     // Only disconnect if we created a new instance
     if (!prisma) {
        await prismaInstance.$disconnect();
     } 
  }
}