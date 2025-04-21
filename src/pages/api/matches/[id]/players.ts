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
      // Fetch match with players
      const match = await prisma.match.findUnique({
        where: { id },
        include: {
          homeTeam: {
            include: {
              players: true
            }
          },
          awayTeam: {
            include: {
              players: true
            }
          },
          format: true,
          playerPairings: {
            include: {
              player: true
            }
          }
        }
      });
      
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }
      
      // Sort players by home and away teams
      // For Singles with foursomeGroupId - only include players in this exact match
      const homePlayers = match.playerPairings
        .filter(p => p.isHomeTeam)
        .map(p => p.player);
        
      const awayPlayers = match.playerPairings
        .filter(p => !p.isHomeTeam)
        .map(p => p.player);
      
      console.log('Debug - Player data being returned:', {
        matchId: match.id,
        format: match.format.formatName,
        playerToPlayerMatch: match.playerToPlayerMatch,
        foursomeGroupId: match.foursomeGroupId,
        pairings: match.playerPairings.map(p => ({
          id: p.id,
          playerId: p.playerId,
          playerName: p.player.name,
          isHomeTeam: p.isHomeTeam,
          pairingGroup: p.pairingGroup
        })),
        homePlayers: homePlayers.map(p => ({id: p.id, name: p.name})),
        awayPlayers: awayPlayers.map(p => ({id: p.id, name: p.name}))
      });
      
      // Get all available players from both teams
      const allHomePlayers = match.homeTeam.players;
      const allAwayPlayers = match.awayTeam.players;
      
      // Determine format requirements
      const isPairsFormat = ['Best Ball', 'Alternate Shot', 'Scramble', 'Chapman'].includes(match.format.formatName);
      const isFourManTeam = match.format.isFourManTeam;
      const isSingles = match.format.formatName === 'Singles';
      
      // Return players info
      res.status(200).json({
        matchId: match.id,
        tournamentId: match.tournamentId,
        scheduleId: match.scheduleId,
        formatId: match.formatId,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        courseId: match.courseId,
        startingHole: match.startingHole,
        teeTime: match.teeTime,
        format: match.format.formatName,
        isPairsFormat,
        isFourManTeam,
        isSingles,
        foursomeGroupId: match.foursomeGroupId,
        playerToPlayerMatch: match.playerToPlayerMatch,
        homePlayers,
        awayPlayers,
        allHomePlayers,
        allAwayPlayers,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        homeTeamIsReal: match.homeTeam.metadata?.isHomeTeam || false,
        awayTeamIsReal: match.awayTeam.metadata?.isHomeTeam || false
      });
    } catch (error) {
      console.error('Error fetching match players:', error);
      res.status(500).json({ error: 'Failed to fetch match players' });
    }
  } else if (req.method === 'POST') {
    try {
      const { homePlayers, awayPlayers } = req.body;
      
      if (!Array.isArray(homePlayers) || !Array.isArray(awayPlayers)) {
        return res.status(400).json({ error: 'Invalid player data format' });
      }
      
      // Verify that the match exists
      const match = await prisma.match.findUnique({
        where: { id },
        include: {
          format: true,
          playerPairings: true
        }
      });
      
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }
      
      // Check if this is a Singles match
      const isSingles = match.format.formatName === 'Singles';
      
      // For singles matches, validate the count
      if (isSingles && !match.playerToPlayerMatch) {
        // A container match can have multiple players (for foursomes)
        if (homePlayers.length !== 2 || awayPlayers.length !== 2) {
          return res.status(400).json({ 
            error: 'Singles matches in batch mode should have exactly 2 players from each team'
          });
        }
      } else if (isSingles && match.playerToPlayerMatch) {
        // A player-to-player match should have exactly 1 player per team
        if (homePlayers.length !== 1 || awayPlayers.length !== 1) {
          return res.status(400).json({ 
            error: 'Singles player-to-player matches should have exactly 1 player from each team'
          });
        }
      }
      
      // Delete existing pairings
      await prisma.playerPairing.deleteMany({
        where: { matchId: id }
      });
      
      // Create new pairings
      const pairings = [
        ...homePlayers.map((playerId: string) => ({
          matchId: id,
          playerId,
          isHomeTeam: true
        })),
        ...awayPlayers.map((playerId: string) => ({
          matchId: id,
          playerId,
          isHomeTeam: false
        }))
      ];
      
      await prisma.playerPairing.createMany({
        data: pairings
      });
      
      res.status(200).json({ message: 'Players assigned successfully' });
    } catch (error) {
      console.error('Error assigning match players:', error);
      res.status(500).json({ error: 'Failed to assign match players' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}