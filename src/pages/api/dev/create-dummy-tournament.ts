import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/utils/auth';
import { sendSuccess, sendError, sendMethodNotAllowed } from '@/services/api/apiResponse';

/**
 * DEVELOPMENT ONLY ROUTE
 * Creates a fully-populated dummy tournament with teams, players, schedules, matches, and scores
 */

/**
 * Type definitions for player pairings
 */
interface PlayerPairing {
  matchId: string;
  playerId: string;
  isHomeTeam: boolean;
  pairingGroup: number;
}

/**
 * Ensures players are assigned to a match, creating assignments if needed
 * This is critical for proper display in the ScorecardsTab component
 */
async function ensureMatchPlayersAssigned(
  matchId: string, 
  homeTeamId: string, 
  awayTeamId: string, 
  formatId: string,
  logFn: (message: string) => void
) {
  // First check if the match already has players
  const existingPairings = await prisma.playerPairing.findMany({
    where: { matchId }
  });
  
  if (existingPairings.length > 0) {
    logFn(`Match ${matchId} already has ${existingPairings.length} player pairings`);
    return existingPairings;
  }
  
  // Match has no players, so we need to assign some
  logFn(`No players assigned to match ${matchId}, adding default players...`);
  
  // Get information about the format to determine how many players to assign
  const format = await prisma.formatMultiplier.findUnique({
    where: { id: formatId },
    select: { formatName: true, isFourManTeam: true }
  });
  
  // Get available players from each team
  const homePlayers = await prisma.player.findMany({
    where: { teamId: homeTeamId },
    take: 4 // Get at most 4 players
  });
  
  const awayPlayers = await prisma.player.findMany({
    where: { teamId: awayTeamId },
    take: 4 // Get at most 4 players
  });
  
  if (homePlayers.length === 0 || awayPlayers.length === 0) {
    logFn(`Cannot assign players: no players found for teams ${homeTeamId} / ${awayTeamId}`);
    return [];
  }
  
  // Determine how many players to assign based on format
  let homePlayerCount = 2; // Default for most formats
  let awayPlayerCount = 2;
  
  // Adjust player count based on format
  const formatName = format?.formatName?.toLowerCase() || '';
  if (formatName.includes('singles')) {
    homePlayerCount = 1;
    awayPlayerCount = 1;
  } else if (format?.isFourManTeam) {
    homePlayerCount = Math.min(4, homePlayers.length);
    awayPlayerCount = Math.min(4, awayPlayers.length);
  } else if (formatName.includes('scramble') || formatName.includes('alternate') || formatName.includes('chapman')) {
    homePlayerCount = 2;
    awayPlayerCount = 2;
  }
  
  // Create pairings data
  const newPairings: PlayerPairing[] = [];
  
  // Add home players
  for (let i = 0; i < Math.min(homePlayerCount, homePlayers.length); i++) {
    newPairings.push({
      matchId,
      playerId: homePlayers[i].id,
      isHomeTeam: true,
      pairingGroup: i + 1
    });
  }
  
  // Add away players
  for (let i = 0; i < Math.min(awayPlayerCount, awayPlayers.length); i++) {
    newPairings.push({
      matchId,
      playerId: awayPlayers[i].id,
      isHomeTeam: false,
      pairingGroup: i + 1
    });
  }
  
  // Create all pairings and catch any errors
  const createdPairings = [];
  for (const pairingData of newPairings) {
    try {
      const pairing = await prisma.playerPairing.create({
        data: pairingData
      });
      createdPairings.push(pairing);
    } catch (error) {
      logFn(`Error creating player pairing: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Try with a different pairing group in case of constraint violations
      try {
        const modifiedData = {
          ...pairingData,
          pairingGroup: pairingData.pairingGroup + 10 // Use a different group number
        };
        const pairing = await prisma.playerPairing.create({
          data: modifiedData
        });
        createdPairings.push(pairing);
      } catch (retryError) {
        logFn(`Failed retry for player pairing: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
      }
    }
  }
  
  logFn(`Successfully created ${createdPairings.length} out of ${newPairings.length} player pairings for match ${matchId}`);
  return createdPairings;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow this in development
  if (process.env.NODE_ENV === 'production') {
    return sendError(res, 'This endpoint is only available in development mode', 403);
  }

  // Skip authentication for dev endpoint
  try {
    if (req.method !== 'POST') {
      return sendMethodNotAllowed(res, ['POST']);
    }

    // Create a dummy tournament with complete data - with detailed logging
    try {
      console.log('Starting tournament creation process...');
      
      let stepLog = [];
      let currentStep = 'initialization';
      
      try {
        const result = await createDummyTournament(
          (step, message) => {
            currentStep = step;
            const logMsg = `STEP ${step}: ${message}`;
            console.log(logMsg);
            stepLog.push(logMsg);
          }
        );
        console.log('Tournament creation completed successfully!');
        return sendSuccess(res, { ...result, stepLog }, 201);
      } catch (error) {
        console.error(`Error in step "${currentStep}":`, error);
        
        // Try to provide a more specific error message by checking the step where it failed
        let errorMessage = `Failed in step "${currentStep}": `;
        if (error instanceof Error) {
          errorMessage += error.message;
          
          // Check for Prisma errors
          if (errorMessage.includes('Prisma')) {
            // Extract more details if it's a prisma error
            const matches = errorMessage.match(/prisma\.(.*?)\.create/i);
            if (matches && matches.length > 1) {
              const modelName = matches[1];
              errorMessage = `Error creating ${modelName}: ${errorMessage}`;
            }
          }
        } else {
          errorMessage += 'Unknown error type';
        }
        
        return sendError(res, { error: errorMessage, stepLog }, 500);
      }
    } catch (error) {
      console.error('Top-level error creating dummy tournament:', error);
      return sendError(res, `Failed to create dummy tournament: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  } catch (error) {
    console.error('Handler error:', error);
    return sendError(res, `Handler error: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
}

/**
 * Create a complete dummy tournament with all related data
 * @param logStep - Callback function to log each step for debugging
 */
async function createDummyTournament(logStep = (step: string, message: string) => {}) {
  logStep('1', 'Initializing tournament dates');
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 1); // Yesterday
  
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 1); // Tomorrow
  
  logStep('2', 'Creating tournament record');
  // Step 1: Create tournament
  let tournament;
  try {
    tournament = await prisma.tournament.create({
      data: {
        name: `Dummy Tournament ${new Date().toISOString().slice(0, 10)}`,
        year: today.getFullYear(),
        location: 'Gull Lake View Golf Club',
        startDate,
        endDate,
        buyIn: 100,
        totalPrize: 5000,
        hasCTP: true,
        ctpPrizeAmount: 500,
        hasSkins: true,
        skinsPrizeAmount: 500,
        payoutStructure: {
          "1": 100,
          "2": 0,
          "3": 0
        }
      }
    });
    logStep('2.1', `Created tournament with ID: ${tournament.id}`);
  } catch (error) {
    logStep('2.E', `Tournament creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
  
  logStep('3', 'Setting up team names');
  // Step 2: Create teams with creative random names
  // Team name generators
  const homeTeamOptions = [
    'Spartan Dawgs', 'Local Legends', 'Home Heroes', 'Green Machine', 
    'Eagle Masters', 'Fairway Flyers', 'Birdie Brigade', 'Par Breakers'
  ];
  
  const awayTeamOptions = [
    'Invited Guests', 'Road Warriors', 'Traveling Aces', 'Visiting Victors', 
    'Out-of-Town Outlaws', 'Challenger Squad', 'Away Avengers', 'Rival Rippers'
  ];
  
  // Pick random team names
  const homeTeamName = homeTeamOptions[Math.floor(Math.random() * homeTeamOptions.length)];
  const awayTeamName = awayTeamOptions[Math.floor(Math.random() * awayTeamOptions.length)];
  
  logStep('4', `Creating home team: ${homeTeamName}`);
  // Create the teams with consistent metadata format
  let homeTeam, awayTeam;
  try {
    homeTeam = await prisma.team.create({
      data: {
        name: homeTeamName,
        tournamentId: tournament.id,
        metadata: { 
          isHomeTeam: true,
          role: 'home',
          createdAt: new Date().toISOString()
        }
      }
    });
    logStep('4.1', `Created home team with ID: ${homeTeam.id}`);
    
    logStep('5', `Creating away team: ${awayTeamName}`);
    awayTeam = await prisma.team.create({
      data: {
        name: awayTeamName,
        tournamentId: tournament.id,
        metadata: { 
          isHomeTeam: false,
          role: 'away',
          createdAt: new Date().toISOString()
        }
      }
    });
    logStep('5.1', `Created away team with ID: ${awayTeam.id}`);
  } catch (error) {
    logStep('5.E', `Team creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
  
  logStep('6', 'Preparing player creation');
  
  // Step 3: Always create brand new players with unique names
  // Generate a unique timestamp-based suffix to ensure unique player names
  const uniqueSuffix = Date.now().toString().slice(-6);
  logStep('6.1', `Using unique player suffix: ${uniqueSuffix}`);
  
  let homePlayers: any[] = [];
  let awayPlayers: any[] = [];

  // Generate random player names and handicaps
  const firstNames = [
    'James', 'Tom', 'Steve', 'Brian', 'Kevin', 'Mark', 'Alex', 'Nick',
    'Dave', 'Rob', 'Mike', 'Josh', 'John', 'David', 'Michael', 'Chris',
    'Matt', 'Ryan', 'Justin', 'Eric', 'Scott', 'Andrew', 'Daniel', 'Greg',
    'Jeff', 'Jason', 'Brandon', 'Tim', 'Gary', 'Frank', 'Patrick', 'Tony'
  ];
  
  const lastNames = [
    'Miller', 'Wilson', 'Adams', 'Taylor', 'Brown', 'Johnson', 'Williams', 'Thompson',
    'Clark', 'Davis', 'Anderson', 'Turner', 'Smith', 'Jones', 'White', 'Harris',
    'Martin', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright',
    'Scott', 'Green', 'Baker', 'Nelson', 'Carter', 'Mitchell', 'Parker', 'Collins'
  ];
  
  // Generate random player creators
  const createRandomPlayer = async (teamId: string, isHome: boolean, index: number) => {
    // Get random names without duplicates
    const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    // Generate handicap between 5 and 25
    const handicapIndex = 5 + Math.random() * 20;
    
    // Team indicator for clarity
    const teamIndicator = isHome ? 'H' : 'A';
    
    const playerName = `${randomFirstName} ${randomLastName} ${uniqueSuffix}-${teamIndicator}${index}`;
    logStep('player', `Creating player: ${playerName}`);
    
    try {
      const player = await prisma.player.create({
        data: {
          name: playerName,
          handicapIndex: handicapIndex,
          teamId: teamId
        }
      });
      logStep('player_success', `Created player: ${playerName} (${player.id})`);
      return player;
    } catch (error) {
      logStep('player_error', `Failed to create player ${playerName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };
  
  try {
    logStep('7', 'Creating home team players');
    // Create 8 random players for each team - one by one with clear error tracking
    homePlayers = [];
    for (let i = 0; i < 8; i++) {
      try {
        const player = await createRandomPlayer(homeTeam.id, true, i+1);
        homePlayers.push(player);
      } catch (error) {
        logStep('7.E', `Failed to create home player ${i+1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    }
    logStep('7.1', `Created ${homePlayers.length} home team players`);
    
    logStep('8', 'Creating away team players');
    awayPlayers = [];
    for (let i = 0; i < 8; i++) {
      try {
        const player = await createRandomPlayer(awayTeam.id, false, i+1);
        awayPlayers.push(player);
      } catch (error) {
        logStep('8.E', `Failed to create away player ${i+1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    }
    logStep('8.1', `Created ${awayPlayers.length} away team players`);
  } catch (error) {
    logStep('8.E', `Player creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
  
  logStep('9', 'Creating player payment records');
  
  try {
    // Add payment records for all players (buy-in, CTP, skins)
    const allPlayers = [...homePlayers, ...awayPlayers];
    let paymentsCreated = 0;
    
    // Create payments one by one instead of all at once
    for (let i = 0; i < allPlayers.length; i++) {
      const player = allPlayers[i];
      logStep('9.1', `Creating payments for player: ${player.name} (${i+1}/${allPlayers.length})`);
      
      try {
        // Buy-in payment
        await prisma.playerPayment.create({
          data: {
            tournamentId: tournament.id,
            playerId: player.id,
            amount: tournament.buyIn || 100,
            type: 'BUY_IN',
            status: 'PAID',
            notes: 'Auto-created for demo'
          }
        });
        paymentsCreated++;
        
        // CTP payment
        await prisma.playerPayment.create({
          data: {
            tournamentId: tournament.id,
            playerId: player.id,
            amount: tournament.ctpPrizeAmount ? tournament.ctpPrizeAmount / 12 : 40,
            type: 'CTP_ENTRY',
            status: 'PAID',
            notes: 'Auto-created for demo'
          }
        });
        paymentsCreated++;
        
        // Skins payment
        await prisma.playerPayment.create({
          data: {
            tournamentId: tournament.id,
            playerId: player.id,
            amount: tournament.skinsPrizeAmount ? tournament.skinsPrizeAmount / 12 : 40,
            type: 'SKINS_ENTRY',
            status: 'PAID',
            notes: 'Auto-created for demo'
          }
        });
        paymentsCreated++;
      } catch (error) {
        logStep('9.E', `Failed to create payment for player ${player.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    }
    
    logStep('9.2', `Created ${paymentsCreated} player payment records`);
  } catch (error) {
    logStep('9.F', `Payment creation process failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
  
  // Step 4: Create format multipliers
  logStep('10', 'Creating format multipliers');
  
  let formats = [];
  try {
    // Singles
    logStep('10.1', 'Creating Singles format');
    const singlesFormat = await prisma.formatMultiplier.create({
      data: {
        formatName: 'Singles',
        multiplier: 1.0,
        points: 1.0,
        halfPoints: 0.5,
        tournamentId: tournament.id,
        isFourManTeam: false
      }
    });
    formats.push(singlesFormat);
    
    // Best Ball
    logStep('10.2', 'Creating Best Ball format');
    const bestBallFormat = await prisma.formatMultiplier.create({
      data: {
        formatName: 'Best Ball',
        multiplier: 0.9,
        points: 1.0,
        halfPoints: 0.5,
        tournamentId: tournament.id,
        isFourManTeam: false
      }
    });
    formats.push(bestBallFormat);
    
    // Alternate Shot
    logStep('10.3', 'Creating Alternate Shot format');
    const alternateFormat = await prisma.formatMultiplier.create({
      data: {
        formatName: 'Alternate Shot',
        multiplier: 0.7,
        points: 1.0,
        halfPoints: 0.5,
        tournamentId: tournament.id,
        isFourManTeam: false
      }
    });
    formats.push(alternateFormat);
    
    // Scramble
    logStep('10.4', 'Creating Scramble format');
    const scrambleFormat = await prisma.formatMultiplier.create({
      data: {
        formatName: 'Scramble',
        multiplier: 0.4,
        points: 1.0,
        halfPoints: 0.5,
        tournamentId: tournament.id,
        isFourManTeam: false
      }
    });
    formats.push(scrambleFormat);
    
    logStep('10.5', `Created ${formats.length} format multipliers`);
  } catch (error) {
    logStep('10.E', `Format creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
  
  logStep('11', 'Creating course and holes');
  
  // Step 5: Create course
  let course;
  let holes = [];
  
  try {
    course = await prisma.course.create({
      data: {
        name: 'Dummy Course',
        tournamentId: tournament.id,
      }
    });
    logStep('11.1', `Created course: ${course.name} (${course.id})`);
    
    // Step 6: Create holes one by one
    logStep('12', 'Creating course holes');
    
    for (let num = 1; num <= 18; num++) {
      try {
        const hole = await prisma.hole.create({
          data: {
            number: num,
            par: num % 3 === 0 ? 3 : num % 5 === 0 ? 5 : 4,
            handicap: num <= 9 ? (num * 2) - 1 : (num - 9) * 2,
            distance: num % 3 === 0 ? 150 + (num * 5) : num % 5 === 0 ? 500 + (num * 3) : 350 + (num * 4),
            isPar3: num % 3 === 0,
            courseId: course.id
          }
        });
        holes.push(hole);
        logStep('12.1', `Created hole: ${num} (${hole.id})`);
      } catch (error) {
        logStep('12.E', `Failed to create hole ${num}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    }
    
    logStep('12.2', `Created ${holes.length} holes`);
  } catch (error) {
    logStep('12.F', `Course/hole creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
  
  console.log(`Created course ${course.name} with ${holes.length} holes`);
  
  // Step 7: Create schedule and matches
  const schedule = await prisma.schedule.create({
    data: {
      tournamentId: tournament.id,
      day: 1,
      date: today
    }
  });
  
  // Create 8 matches with different formats as requested:
  // best ball, singles, alt shot, scramble, scramble, altshot, scramble, scramble
  const teeTime = new Date(today);
  teeTime.setHours(8, 0, 0, 0);
  
  // Generate unique foursome group IDs for singles matches
  const foursomeGroupId1 = `foursome_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const foursomeGroupId2 = `foursome_${Date.now() + 1}_${Math.random().toString(36).substring(2, 7)}`;
  
  // Match 1: Best Ball (8:00 AM) - Front 9
  const bestBallMatch1 = await prisma.match.create({
    data: {
      tournamentId: tournament.id,
      scheduleId: schedule.id,
      formatId: formats[1].id, // Best Ball
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      courseId: course.id,
      startingHole: 1,
      teeTime
    }
  });
  
  // Match 2: Singles (8:10 AM) - Front 9
  teeTime.setMinutes(teeTime.getMinutes() + 10);
  const singlesMatch1 = await prisma.match.create({
    data: {
      tournamentId: tournament.id,
      scheduleId: schedule.id,
      formatId: formats[0].id, // Singles
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      courseId: course.id,
      startingHole: 1,
      teeTime,
      playerToPlayerMatch: true,
      foursomeGroupId: foursomeGroupId1
    }
  });
  
  const singlesMatch2 = await prisma.match.create({
    data: {
      tournamentId: tournament.id,
      scheduleId: schedule.id,
      formatId: formats[0].id, // Singles
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      courseId: course.id,
      startingHole: 1,
      teeTime,
      playerToPlayerMatch: true,
      foursomeGroupId: foursomeGroupId1
    }
  });
  
  // Match 3: Alternate Shot (8:20 AM) - Front 9
  teeTime.setMinutes(teeTime.getMinutes() + 10);
  const alternateMatch1 = await prisma.match.create({
    data: {
      tournamentId: tournament.id,
      scheduleId: schedule.id,
      formatId: formats[2].id, // Alternate Shot
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      courseId: course.id,
      startingHole: 1,
      teeTime
    }
  });
  
  // Match 4: Scramble (8:30 AM) - Front 9
  teeTime.setMinutes(teeTime.getMinutes() + 10);
  const scrambleMatch1 = await prisma.match.create({
    data: {
      tournamentId: tournament.id,
      scheduleId: schedule.id,
      formatId: formats[3].id, // Scramble
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      courseId: course.id,
      startingHole: 1,
      teeTime
    }
  });
  
  // Match 5: Scramble (9:00 AM) - Back 9
  teeTime.setHours(9, 0, 0, 0);
  const scrambleMatch2 = await prisma.match.create({
    data: {
      tournamentId: tournament.id,
      scheduleId: schedule.id,
      formatId: formats[3].id, // Scramble
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      courseId: course.id,
      startingHole: 10,
      teeTime
    }
  });
  
  // Match 6: Alternate Shot (9:10 AM) - Back 9
  teeTime.setMinutes(teeTime.getMinutes() + 10);
  const alternateMatch2 = await prisma.match.create({
    data: {
      tournamentId: tournament.id,
      scheduleId: schedule.id,
      formatId: formats[2].id, // Alternate Shot
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      courseId: course.id,
      startingHole: 10,
      teeTime
    }
  });
  
  // Match 7: Scramble (9:20 AM) - Back 9
  teeTime.setMinutes(teeTime.getMinutes() + 10);
  const scrambleMatch3 = await prisma.match.create({
    data: {
      tournamentId: tournament.id,
      scheduleId: schedule.id,
      formatId: formats[3].id, // Scramble
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      courseId: course.id,
      startingHole: 10,
      teeTime
    }
  });
  
  // Match 8: Scramble (9:30 AM) - Back 9
  teeTime.setMinutes(teeTime.getMinutes() + 10);
  const scrambleMatch4 = await prisma.match.create({
    data: {
      tournamentId: tournament.id,
      scheduleId: schedule.id,
      formatId: formats[3].id, // Scramble
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      courseId: course.id,
      startingHole: 10,
      teeTime
    }
  });
  
  const matchCount = 8;
  console.log(`Created ${matchCount} matches`);

  // Create a list of all match IDs for reference and verification
  const matchIds = [
    bestBallMatch1.id,
    singlesMatch1.id,
    singlesMatch2.id,
    alternateMatch1.id,
    scrambleMatch1.id,
    scrambleMatch2.id,
    alternateMatch2.id,
    scrambleMatch3.id,
    scrambleMatch4.id
  ];
  console.log(`Created matches with IDs: ${matchIds.length} total`);
  
  // Step 8: Assign players to matches
  console.log('Creating player pairings for all matches...');
  
  // Create player pairings in batch for all 8 matches
  const playerPairingData = [
    // Match 1: Best Ball (players 0,1 vs 0,1)
    {
      matchId: bestBallMatch1.id,
      playerId: homePlayers[0].id,
      isHomeTeam: true,
      pairingGroup: 1
    },
    {
      matchId: bestBallMatch1.id,
      playerId: homePlayers[1].id,
      isHomeTeam: true,
      pairingGroup: 1
    },
    {
      matchId: bestBallMatch1.id,
      playerId: awayPlayers[0].id,
      isHomeTeam: false,
      pairingGroup: 1
    },
    {
      matchId: bestBallMatch1.id,
      playerId: awayPlayers[1].id,
      isHomeTeam: false,
      pairingGroup: 1
    },
    
    // Match 2: Singles - First two player matchups
    {
      matchId: singlesMatch1.id,
      playerId: homePlayers[0].id,
      isHomeTeam: true,
      pairingGroup: 1
    },
    {
      matchId: singlesMatch1.id,
      playerId: awayPlayers[0].id,
      isHomeTeam: false,
      pairingGroup: 1
    },
    {
      matchId: singlesMatch2.id,
      playerId: homePlayers[1].id,
      isHomeTeam: true,
      pairingGroup: 2
    },
    {
      matchId: singlesMatch2.id,
      playerId: awayPlayers[1].id,
      isHomeTeam: false,
      pairingGroup: 2
    },
    
    // Match 3: Alternate Shot (players 2,3 vs 2,3)
    {
      matchId: alternateMatch1.id,
      playerId: homePlayers[2].id,
      isHomeTeam: true,
      pairingGroup: 1
    },
    {
      matchId: alternateMatch1.id,
      playerId: homePlayers[3].id,
      isHomeTeam: true,
      pairingGroup: 1
    },
    {
      matchId: alternateMatch1.id,
      playerId: awayPlayers[2].id,
      isHomeTeam: false,
      pairingGroup: 1
    },
    {
      matchId: alternateMatch1.id,
      playerId: awayPlayers[3].id,
      isHomeTeam: false,
      pairingGroup: 1
    },
    
    // Match 4: Scramble - Front 9 (players 4,5 vs 4,5)
    {
      matchId: scrambleMatch1.id,
      playerId: homePlayers[4].id,
      isHomeTeam: true,
      pairingGroup: 1
    },
    {
      matchId: scrambleMatch1.id,
      playerId: homePlayers[5].id,
      isHomeTeam: true,
      pairingGroup: 1
    },
    {
      matchId: scrambleMatch1.id,
      playerId: awayPlayers[4].id,
      isHomeTeam: false,
      pairingGroup: 1
    },
    {
      matchId: scrambleMatch1.id,
      playerId: awayPlayers[5].id,
      isHomeTeam: false,
      pairingGroup: 1
    },
    
    // Match 5: Scramble - Back 9 (players 6,7 vs 6,7)
    {
      matchId: scrambleMatch2.id,
      playerId: homePlayers[6].id,
      isHomeTeam: true,
      pairingGroup: 1
    },
    {
      matchId: scrambleMatch2.id,
      playerId: homePlayers[7].id,
      isHomeTeam: true,
      pairingGroup: 1
    },
    {
      matchId: scrambleMatch2.id,
      playerId: awayPlayers[6].id,
      isHomeTeam: false,
      pairingGroup: 1
    },
    {
      matchId: scrambleMatch2.id,
      playerId: awayPlayers[7].id,
      isHomeTeam: false,
      pairingGroup: 1
    },
    
    // Match 6: Alternate Shot - Back 9 (players 0,2 vs 0,2)
    {
      matchId: alternateMatch2.id,
      playerId: homePlayers[0].id,
      isHomeTeam: true,
      pairingGroup: 1
    },
    {
      matchId: alternateMatch2.id,
      playerId: homePlayers[2].id,
      isHomeTeam: true,
      pairingGroup: 1
    },
    {
      matchId: alternateMatch2.id,
      playerId: awayPlayers[0].id,
      isHomeTeam: false,
      pairingGroup: 1
    },
    {
      matchId: alternateMatch2.id,
      playerId: awayPlayers[2].id,
      isHomeTeam: false,
      pairingGroup: 1
    },
    
    // Match 7: Scramble - Back 9 (players 1,3 vs 1,3)
    {
      matchId: scrambleMatch3.id,
      playerId: homePlayers[1].id,
      isHomeTeam: true,
      pairingGroup: 1
    },
    {
      matchId: scrambleMatch3.id,
      playerId: homePlayers[3].id,
      isHomeTeam: true,
      pairingGroup: 1
    },
    {
      matchId: scrambleMatch3.id,
      playerId: awayPlayers[1].id,
      isHomeTeam: false,
      pairingGroup: 1
    },
    {
      matchId: scrambleMatch3.id,
      playerId: awayPlayers[3].id,
      isHomeTeam: false,
      pairingGroup: 1
    },
    
    // Match 8: Scramble - Back 9 (players 4,6 vs 4,6)
    {
      matchId: scrambleMatch4.id,
      playerId: homePlayers[4].id,
      isHomeTeam: true,
      pairingGroup: 1
    },
    {
      matchId: scrambleMatch4.id,
      playerId: homePlayers[6].id,
      isHomeTeam: true,
      pairingGroup: 1
    },
    {
      matchId: scrambleMatch4.id,
      playerId: awayPlayers[4].id,
      isHomeTeam: false,
      pairingGroup: 1
    },
    {
      matchId: scrambleMatch4.id,
      playerId: awayPlayers[6].id,
      isHomeTeam: false,
      pairingGroup: 1
    }
  ];
  
  // Create all pairings one by one to avoid any potential batch issues
  let successfulPairings = 0;
  for (const pairingData of playerPairingData) {
    try {
      await prisma.playerPairing.create({
        data: pairingData
      });
      successfulPairings++;
    } catch (error) {
      console.error('Error creating player pairing:', error, pairingData);
      // Try to create again with a different approach
      try {
        // Sometimes we get a unique constraint error, so try creating with a different pairingGroup
        const modifiedData = {
          ...pairingData, 
          pairingGroup: pairingData.pairingGroup + 10 // Use a higher group number to avoid conflicts
        };
        await prisma.playerPairing.create({
          data: modifiedData
        });
        successfulPairings++;
        console.log('Successfully created pairing with modified group');
      } catch (retryError) {
        console.error('Failed retry for player pairing:', retryError);
      }
    }
  }
  
  console.log(`Successfully created ${successfulPairings} out of ${playerPairingData.length} player pairings`);
  
  // Verify all matches have players assigned using our helper function
  console.log('Verifying all matches have players assigned...');
  for (const matchId of matchIds) {
    try {
      // Get the match details for homeTeamId, awayTeamId, and formatId
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: { 
          id: true, 
          homeTeamId: true, 
          awayTeamId: true, 
          formatId: true,
          format: {
            select: { formatName: true }
          }
        }
      });
      
      if (!match) {
        console.log(`WARNING: Match ${matchId} not found`);
        continue;
      }
      
      console.log(`Verifying players for match ${matchId} (format: ${match.format?.formatName || 'Unknown'})`);
      
      // Check if the match already has player pairings
      const existingPairings = await prisma.playerPairing.findMany({
        where: { matchId }
      });
      
      if (existingPairings.length === 0) {
        // No players assigned, use our helper function to ensure players are assigned
        console.log(`No player pairings found for match ${matchId}, using helper to assign default players...`);
        await ensureMatchPlayersAssigned(
          matchId, 
          match.homeTeamId, 
          match.awayTeamId, 
          match.formatId,
          (msg) => console.log(msg) // Simple logging function
        );
      } else {
        console.log(`Match ${matchId} already has ${existingPairings.length} player pairings`);
      }
    } catch (error) {
      console.error(`Error verifying players for match ${matchId}:`, error);
    }
  }
  
  console.log(`Created ${playerPairingData.length} player pairings for matches`);
  
  console.log('Assigned players to matches');

  // Step 9: Create hole results for all 8 matches
  console.log('Creating hole results for all matches...');
  
  // Helper function to get random score
  const getRandomScore = (par: number) => par - 1 + Math.floor(Math.random() * 5); // par-1 to par+3
  
  // Helper function to create hole results for a match
  const createHoleResultsForMatch = async (matchId: string, startingHole: number) => {
    const holeResultsData = [];
    
    // Determine hole range based on starting hole (1-9 or 10-18)
    const startHoleNum = startingHole;
    const endHoleNum = startingHole <= 1 ? 9 : 18;
    
    // Get match details to determine format
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        format: true,
        playerPairings: {
          include: {
            player: true
          }
        }
      }
    });
    
    if (!match) {
      console.error(`Match ${matchId} not found`);
      return 0;
    }
    
    // Determine if this is a Singles or Best Ball match
    const isSinglesOrBestBall = match.format.formatName.toLowerCase().includes('singles') || 
                               match.format.formatName.toLowerCase().includes('best ball');
    
    // Get players for each team
    const homePlayers = match.playerPairings.filter(p => p.isHomeTeam).map(p => p.player);
    const awayPlayers = match.playerPairings.filter(p => !p.isHomeTeam).map(p => p.player);
    
    for (let holeNumber = startHoleNum; holeNumber <= endHoleNum; holeNumber++) {
      const hole = holes.find(h => h.number === holeNumber);
      if (!hole) continue;
      
      // For Singles/Best Ball, generate individual player scores
      const homePlayerScores = {};
      const awayPlayerScores = {};
      
      if (isSinglesOrBestBall) {
        // Generate individual player scores
        homePlayers.forEach(player => {
          homePlayerScores[player.id] = getRandomScore(hole.par);
        });
        
        awayPlayers.forEach(player => {
          awayPlayerScores[player.id] = getRandomScore(hole.par);
        });
        
        // For Singles, use player score as team score
        // For Best Ball, use best (lowest) player score as team score
        const homeGross = match.format.formatName.toLowerCase().includes('singles') && homePlayers.length === 1 
          ? homePlayerScores[homePlayers[0].id]
          : Math.min(...Object.values(homePlayerScores));
          
        const awayGross = match.format.formatName.toLowerCase().includes('singles') && awayPlayers.length === 1
          ? awayPlayerScores[awayPlayers[0].id]
          : Math.min(...Object.values(awayPlayerScores));
        
        // Calculate net scores with handicap adjustment
        // We'll simplify by using a fixed handicap adjustment based on hole handicap
        let homeNet = homeGross;
        let awayNet = awayGross;
        
        // On harder holes (lower handicap number), give strokes
        if (hole.handicap <= 9) {
          homeNet -= 1;
        }
        
        if (hole.handicap <= 6) {
          awayNet -= 1;
        }
        
        // Determine winner
        let winnerId = null;
        if (homeNet < awayNet) {
          winnerId = homeTeam.id;
        } else if (awayNet < homeNet) {
          winnerId = awayTeam.id;
        }
        
        // Potentially mark as a skin
        const isSkin = Math.random() < 0.2; // 20% chance of being a skin
        
        // Create hole result with player scores as metadata
        holeResultsData.push({
          matchId,
          holeId: hole.id,
          homeTeamGrossScore: homeGross,
          awayTeamGrossScore: awayGross,
          homeTeamNetScore: homeNet,
          awayTeamNetScore: awayNet,
          winnerTeamId: winnerId,
          isSkin: isSkin,
          metadata: {
            homePlayerScores,
            awayPlayerScores
          }
        });
      } else {
        // Standard team match - regular scoring
        const homeGross = getRandomScore(hole.par);
        const awayGross = getRandomScore(hole.par);
        
        // Calculate net scores with handicap adjustment
        let homeNet = homeGross;
        let awayNet = awayGross;
        
        // On harder holes (lower handicap number), give strokes
        if (hole.handicap <= 9) {
          homeNet -= 1;
        }
        
        if (hole.handicap <= 6) {
          awayNet -= 1;
        }
        
        // Determine winner
        let winnerId = null;
        if (homeNet < awayNet) {
          winnerId = homeTeam.id;
        } else if (awayNet < homeNet) {
          winnerId = awayTeam.id;
        }
        
        // Potentially mark as a skin
        const isSkin = Math.random() < 0.2; // 20% chance of being a skin
        
        holeResultsData.push({
          matchId,
          holeId: hole.id,
          homeTeamGrossScore: homeGross,
          awayTeamGrossScore: awayGross,
          homeTeamNetScore: homeNet,
          awayTeamNetScore: awayNet,
          winnerTeamId: winnerId,
          isSkin: isSkin
        });
      }
    }
    
    // Create hole results one by one to avoid potential issues
    let createdCount = 0;
    for (const holeResult of holeResultsData) {
      try {
        await prisma.holeResult.create({
          data: holeResult
        });
        createdCount++;
      } catch (error) {
        console.error('Error creating hole result:', error);
        // Continue with other hole results
      }
    }
    
    return createdCount;
  };
  
  // Create results for all matches
  let totalHoleResults = 0;
  
  // Create results for front 9 matches (starting hole 1)
  totalHoleResults += await createHoleResultsForMatch(bestBallMatch1.id, 1);
  totalHoleResults += await createHoleResultsForMatch(singlesMatch1.id, 1);
  totalHoleResults += await createHoleResultsForMatch(singlesMatch2.id, 1);
  totalHoleResults += await createHoleResultsForMatch(alternateMatch1.id, 1);
  totalHoleResults += await createHoleResultsForMatch(scrambleMatch1.id, 1);
  
  // Create results for back 9 matches (starting hole 10)
  totalHoleResults += await createHoleResultsForMatch(scrambleMatch2.id, 10);
  totalHoleResults += await createHoleResultsForMatch(alternateMatch2.id, 10);
  totalHoleResults += await createHoleResultsForMatch(scrambleMatch3.id, 10);
  totalHoleResults += await createHoleResultsForMatch(scrambleMatch4.id, 10);
  
  console.log(`Created ${totalHoleResults} hole results across all matches`);
  
  // Step 10: Update match points for all matches
  console.log('Calculating match points for all matches...');
  
  // Helper function to calculate match points
  const calculateAndCreateMatchPoints = async (matchId: string) => {
    // Get hole results for this match
    const holeResults = await prisma.holeResult.findMany({
      where: { matchId }
    });
    
    // Calculate points
    let homeTeamPoints = 0;
    let awayTeamPoints = 0;
    
    holeResults.forEach(result => {
      if (result.winnerTeamId === homeTeam.id) {
        homeTeamPoints += 1;
      } else if (result.winnerTeamId === awayTeam.id) {
        awayTeamPoints += 1;
      } else if (result.winnerTeamId === null && result.homeTeamNetScore !== null) {
        // Tied hole
        homeTeamPoints += 0.5;
        awayTeamPoints += 0.5;
      }
    });
    
    // Create match points record
    await prisma.matchPoints.create({
      data: {
        matchId,
        homeTeamPoints,
        awayTeamPoints
      }
    });
    
    return { homeTeamPoints, awayTeamPoints };
  };
  
  // Calculate and create match points for all matches
  // We already defined matchIds above, so we'll reuse that list
  
  for (const matchId of matchIds) {
    const { homeTeamPoints, awayTeamPoints } = await calculateAndCreateMatchPoints(matchId);
    console.log(`Match ${matchId.slice(-4)}: Home ${homeTeamPoints} - Away ${awayTeamPoints}`);
  }
  
  console.log(`Updated match points for all ${matchIds.length} matches`);

  // Step 11: Create skin records for holes marked as skins
  console.log('Creating skin records for holes marked as skins...');
  
  // Find all hole results with isSkin=true
  const skinHoleResults = await prisma.holeResult.findMany({
    where: { isSkin: true },
    include: {
      match: true,
      hole: true
    }
  });
  
  // Create a skin record for each skin
  const skinsCreated = [];

  for (const result of skinHoleResults) {
    try {
      // Determine which team won the skin
      const teamWon = result.homeTeamNetScore !== null && 
                      result.awayTeamNetScore !== null && 
                      result.homeTeamNetScore < result.awayTeamNetScore ? 'home' : 'away';
      
      // Get a random player from the winning team for this match
      const playerPairings = await prisma.playerPairing.findMany({
        where: {
          matchId: result.matchId,
          isHomeTeam: teamWon === 'home'
        },
        include: {
          player: true
        }
      });
      
      if (playerPairings.length > 0) {
        // Select random player from the winning team
        const randomPlayerIndex = Math.floor(Math.random() * playerPairings.length);
        const winningPlayer = playerPairings[randomPlayerIndex].player;
        
        // Get the winning score (default to 3 if null)
        const score = (teamWon === 'home' ? 
          result.homeTeamGrossScore : result.awayTeamGrossScore) || 3;
        
        // Ensure hole number is valid
        const holeNumber = result.hole?.number;
        if (!holeNumber) {
          console.error('Missing hole number for skin result:', result);
          continue;
        }
        
        // Create skin record
        const skinResult = await prisma.skinsResult.create({
          data: {
            tournamentId: tournament.id,
            playerId: winningPlayer.id,
            matchId: result.matchId,
            holeNumber: holeNumber,
            score: score, 
            prize: null, // Will be calculated later
            paid: false
          }
        });
        
        console.log(`Created skin for match ${result.matchId} on hole ${holeNumber} by player ${winningPlayer.name} with score ${score}`);
        skinsCreated.push(skinResult);
      }
    } catch (error) {
      console.error('Error creating skin result:', error);
    }
  }
  
  const validSkinResults = skinsCreated;
  
  console.log(`Created ${validSkinResults.length} skin records from ${skinHoleResults.length} possible skin holes`);
  
  // Step 12: Create CTP (Closest to Pin) winners for par 3 holes
  console.log('Creating CTP winners for par 3 holes...');
  
  // Find all par 3 holes
  const par3Holes = holes.filter(hole => hole.isPar3);
  console.log(`Found ${par3Holes.length} par 3 holes`);
  
  // Get all players to randomly assign as CTP winners
  const allPlayers = [...homePlayers, ...awayPlayers];
  
  // Create CTP winners
  const ctpResults = [];
  
  for (const hole of par3Holes) {
    try {
      // Select random player as winner
      const randomPlayerIndex = Math.floor(Math.random() * allPlayers.length);
      const winningPlayer = allPlayers[randomPlayerIndex];
      
      // Create random distance (2ft to 15ft from pin)
      const distance = 2 + Math.floor(Math.random() * 13);
      
      // Create CTP record
      const ctpResult = await prisma.cTPResult.create({
        data: {
          tournamentId: tournament.id,
          holeId: hole.id,
          playerId: winningPlayer.id,
          distance: distance,
          round: 1,
          prize: null, // Will be calculated later
          paid: false
        }
      });
      
      ctpResults.push(ctpResult);
    } catch (error) {
      console.error('Error creating CTP result:', error);
    }
  }
  
  console.log(`Created ${ctpResults.length} CTP winner records`);
  
  // Return the tournament ID for reference
  return {
    message: 'Dummy tournament created successfully',
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    teamsCreated: 2, 
    playersCreated: homePlayers.length + awayPlayers.length,
    matchesCreated: matchCount,
    holesCreated: holes.length,
    holeResultsCreated: totalHoleResults
  };
}