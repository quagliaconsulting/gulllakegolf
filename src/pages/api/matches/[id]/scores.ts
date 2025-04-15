import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

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
      
      // Calculate team handicaps
      const homePlayers = match.playerPairings
        .filter(p => p.isHomeTeam)
        .map(p => p.player);
        
      const awayPlayers = match.playerPairings
        .filter(p => !p.isHomeTeam)
        .map(p => p.player);
        
      const homeTeamHandicap = calculateTeamHandicap(
        homePlayers.map(p => p.handicapIndex),
        match.format.formatName
      );
      
      const awayTeamHandicap = calculateTeamHandicap(
        awayPlayers.map(p => p.handicapIndex),
        match.format.formatName
      );
      
      // Format hole results
      const holes = match.course.holes.map(hole => {
        const holeResult = match.holeResults.find(r => r.holeId === hole.id);
        
        return {
          number: hole.number,
          par: hole.par,
          handicap: hole.handicap,
          homeGross: holeResult?.homeTeamGrossScore || null,
          awayGross: holeResult?.awayTeamGrossScore || null,
          homeNet: holeResult?.homeTeamNetScore || null,
          awayNet: holeResult?.awayTeamNetScore || null,
          winner: getWinner(holeResult),
        };
      });
      
      // Return formatted match with scores
      const result = {
        id: match.id,
        format: match.format.formatName,
        formatMultiplier: match.format.multiplier,
        isFourManTeam: match.format.isFourManTeam || false,
        homeTeam: match.homeTeam?.name || 'Team 1',
        awayTeam: match.awayTeam?.name || 'Team 2',
        time: match.teeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        course: match.course.name,
        startingHole: match.startingHole,
        homePlayers,
        awayPlayers,
        holes,
        homeTeamHandicap,
        awayTeamHandicap,
        points: match.points,
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
      
      // Calculate team handicaps
      const homePlayers = match.playerPairings
        .filter(p => p.isHomeTeam)
        .map(p => p.player);
        
      const awayPlayers = match.playerPairings
        .filter(p => !p.isHomeTeam)
        .map(p => p.player);
        
      const homeTeamHandicap = calculateTeamHandicap(
        homePlayers.map(p => p.handicapIndex),
        match.format.formatName
      ) * match.format.multiplier;
      
      const awayTeamHandicap = calculateTeamHandicap(
        awayPlayers.map(p => p.handicapIndex),
        match.format.formatName
      ) * match.format.multiplier;
      
      // Process each hole score
      const updates = [];
      for (const holeData of holes) {
        if (!holeData.number || !match.course.holes.some(h => h.number === holeData.number)) {
          continue;
        }
        
        const hole = match.course.holes.find(h => h.number === holeData.number);
        
        if (!hole) {
          continue;
        }
        
        // Calculate net scores using hole handicap index for proper match play allocation
        const homeNetScore = calculateNetScore(
          holeData.homeGross, 
          homeTeamHandicap, 
          hole.handicap, // Use the hole's handicap index (1-18)
          match.format.isFourManTeam || false
        );
        const awayNetScore = calculateNetScore(
          holeData.awayGross, 
          awayTeamHandicap, 
          hole.handicap, // Use the hole's handicap index (1-18)
          match.format.isFourManTeam || false
        );
        
        // Determine winner
        let winner = determineWinner(homeNetScore, awayNetScore);
        
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
              homeTeamGrossScore: holeData.homeGross || null,
              awayTeamGrossScore: holeData.awayGross || null,
              homeTeamNetScore: homeNetScore,
              awayTeamNetScore: awayNetScore,
              winnerTeamId: winner === 'home' ? match.homeTeamId : 
                            winner === 'away' ? match.awayTeamId : null,
            },
            create: {
              matchId: id,
              holeId: hole.id,
              homeTeamGrossScore: holeData.homeGross || null,
              awayTeamGrossScore: holeData.awayGross || null,
              homeTeamNetScore: homeNetScore,
              awayTeamNetScore: awayNetScore,
              winnerTeamId: winner === 'home' ? match.homeTeamId : 
                            winner === 'away' ? match.awayTeamId : null,
            }
          })
        );
      }
      
      // Execute all updates
      await prisma.$transaction(updates);
      
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

// Helper functions
function calculateTeamHandicap(playerHandicaps: number[], format: string): number {
  if (!playerHandicaps || playerHandicaps.length === 0) return 0;

  switch (format.toLowerCase()) {
    case 'best ball':
      // Use 90% of the lowest handicap player
      const lowestHandicap = Math.min(...playerHandicaps);
      return lowestHandicap * 0.9;
    
    case 'alternate shot':
      // Average of the two players' handicaps
      const sum = playerHandicaps.reduce((a, b) => a + b, 0);
      return sum / playerHandicaps.length;
    
    case 'scramble':
      // Use 35% of the lowest handicap player, plus 15% of the highest
      if (playerHandicaps.length >= 2) {
        const sortedHandicaps = [...playerHandicaps].sort((a, b) => a - b);
        const lowest = sortedHandicaps[0];
        const highest = sortedHandicaps[sortedHandicaps.length - 1];
        return (lowest * 0.35) + (highest * 0.15);
      }
      return playerHandicaps[0];
    
    case 'chapman':
      // Use 60% of the lower handicap player plus 40% of the higher handicap player
      if (playerHandicaps.length >= 2) {
        const sortedHandicaps = [...playerHandicaps].sort((a, b) => a - b);
        const lower = sortedHandicaps[0];
        const higher = sortedHandicaps[1];
        return (lower * 0.6) + (higher * 0.4);
      }
      return playerHandicaps[0];
    
    default:
      // For unknown formats, use average
      const total = playerHandicaps.reduce((a, b) => a + b, 0);
      return total / playerHandicaps.length;
  }
}

/**
 * Determine if a stroke should be given on a specific hole based on player handicap
 * and hole handicap index (match play rules)
 */
function getStrokesOnHole(playerHandicap: number, holeHandicapIndex: number): number {
  // No strokes if handicap is 0 or negative
  if (playerHandicap <= 0) return 0;
  
  // For handicaps 1-18, give one stroke on holes with index <= handicap
  if (playerHandicap <= 18) {
    return holeHandicapIndex <= playerHandicap ? 1 : 0;
  }
  
  // For handicaps > 18, give multiple strokes on some holes
  // First get base strokes (1 stroke on each hole)
  let strokes = 1;
  
  // Then add additional strokes based on remaining handicap
  const remainingHandicap = playerHandicap - 18;
  if (holeHandicapIndex <= remainingHandicap) {
    strokes += 1;
  }
  
  // For very high handicaps (> 36), continue the pattern
  if (remainingHandicap > 18) {
    const additionalStrokes = Math.floor((remainingHandicap - 18) / 18);
    strokes += additionalStrokes;
    
    // Check if this hole gets one more stroke from the remaining handicap
    const finalRemainder = remainingHandicap - (additionalStrokes * 18);
    if (holeHandicapIndex <= finalRemainder) {
      strokes += 1;
    }
  }
  
  return strokes;
}

/**
 * Calculate net score using proper match play allocation
 */
function calculateNetScore(
  grossScore: number | null, 
  handicap: number, 
  holeHandicapIndex: number,
  isFourManTeam: boolean = false
): number | null {
  if (grossScore === null || grossScore === undefined) return null;
  
  // For 4-man team events, return gross score directly
  if (isFourManTeam) {
    return grossScore;
  }
  
  // Get strokes for this hole based on handicap and hole index
  const strokesOnHole = getStrokesOnHole(handicap, holeHandicapIndex);
  
  // Apply strokes to gross score
  const netScore = Math.max(1, grossScore - strokesOnHole);
  return Math.round(netScore * 10) / 10; // Round to 1 decimal place
}

function determineWinner(homeNetScore: number | null, awayNetScore: number | null): 'home' | 'away' | 'tie' | null {
  if (homeNetScore === null || awayNetScore === null) return null;
  
  if (homeNetScore < awayNetScore) {
    return 'home';
  } else if (awayNetScore < homeNetScore) {
    return 'away';
  } else {
    return 'tie';
  }
}

function getWinner(holeResult: any): string | null {
  if (!holeResult || !holeResult.winnerTeamId) return null;
  if (holeResult.homeTeamNetScore === holeResult.awayTeamNetScore) return 'tie';
  return holeResult.homeTeamNetScore < holeResult.awayTeamNetScore ? 'home' : 'away';
}

async function updateMatchPoints(matchId: string) {
  const prisma = new PrismaClient();
  
  try {
    // Get all hole results for this match
    const holeResults = await prisma.holeResult.findMany({
      where: { matchId }
    });
    
    // Count points for each team
    let homePoints = 0;
    let awayPoints = 0;
    
    holeResults.forEach(result => {
      if (result.homeTeamNetScore !== null && result.awayTeamNetScore !== null) {
        if (result.homeTeamNetScore < result.awayTeamNetScore) {
          homePoints++;
        } else if (result.awayTeamNetScore < result.homeTeamNetScore) {
          awayPoints++;
        }
        // Ties don't add points to either team
      }
    });
    
    // Update match points
    await prisma.matchPoints.upsert({
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
  } finally {
    await prisma.$disconnect();
  }
}