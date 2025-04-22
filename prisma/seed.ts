import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Hash password for admin user
  const passwordHash = await bcrypt.hash('password123', 10);

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'jamesquags@gmail.com' },
    update: {
      password: passwordHash,
      role: 'ADMIN'
    },
    create: {
      email: 'jamesquags@gmail.com',
      password: passwordHash,
      name: 'James Quaglia',
      role: 'ADMIN',
    }
  });

  console.log('Created admin user:', adminUser.email);

  // Create Tournament
  const tournament = await prisma.tournament.create({
    data: {
      name: 'Spring Classic 2023',
      year: 2023,
      location: 'Gull Lake',
      startDate: new Date('2023-05-18'),
      endDate: new Date('2023-05-20'),
      teams: {
        create: [
          { 
            name: 'Spartan Dawgs',
            players: {
              create: [
                { name: 'James Quaglia', handicapIndex: 16.0 },
                { name: 'Dan Quaglia', handicapIndex: 7.8 },
                { name: 'Gary Gross', handicapIndex: 10.3 },
                { name: 'Gregg Blanchard', handicapIndex: 11.4 },
                { name: 'Vince Limauro', handicapIndex: 8.8 },
                { name: 'Marcus VanAmerongen', handicapIndex: 8.1 },
                { name: 'Serge Vladimiroff', handicapIndex: 10.3 },
                { name: 'Jamie Crow', handicapIndex: 13.9 },
                { name: 'Ryan Church', handicapIndex: 10.4 },
                { name: 'Mike Cox', handicapIndex: 10.9 },
                { name: 'Dave Gross', handicapIndex: 18.5 },
                { name: 'Scott Hamilton', handicapIndex: 15.6 },
              ]
            }
          },
          { 
            name: 'Invited Guests',
            players: {
              create: [
                { name: 'Brian Vanderklok', handicapIndex: 15.3 },
                { name: 'Jeff Vanderklok', handicapIndex: 12.0 },
                { name: 'Chris Trenary', handicapIndex: 14.5 },
                { name: 'Don Smith', handicapIndex: 10.0 },
                { name: 'Luke DeYoung', handicapIndex: 13.4 },
                { name: 'Scott Curtis', handicapIndex: 10.0 },
                { name: 'Rick Ghinelli', handicapIndex: 10.7 },
                { name: 'Andy Ghinelli', handicapIndex: 9.0 },
                { name: 'Brian Charters', handicapIndex: 7.9 },
                { name: 'Randy Charters', handicapIndex: 10.1 },
                { name: 'Tim Halloran', handicapIndex: 14.5 },
                { name: 'Tom Boritzki', handicapIndex: 12.3 },
              ]
            }
          }
        ]
      },
      courses: {
        create: [
          {
            name: 'Stoatin Brae',
            holes: {
              create: [
                { number: 1, par: 4, handicap: 7, distance: 410 },
                { number: 2, par: 3, handicap: 15, distance: 170 },
                { number: 3, par: 5, handicap: 1, distance: 565 },
                { number: 4, par: 4, handicap: 9, distance: 425 },
                { number: 5, par: 3, handicap: 17, distance: 160 },
                { number: 6, par: 4, handicap: 5, distance: 445 },
                { number: 7, par: 5, handicap: 3, distance: 535 },
                { number: 8, par: 4, handicap: 11, distance: 400 },
                { number: 9, par: 4, handicap: 13, distance: 390 },
                { number: 10, par: 4, handicap: 8, distance: 415 },
                { number: 11, par: 5, handicap: 2, distance: 550 },
                { number: 12, par: 3, handicap: 16, distance: 175 },
                { number: 13, par: 4, handicap: 4, distance: 440 },
                { number: 14, par: 4, handicap: 10, distance: 395 },
                { number: 15, par: 3, handicap: 18, distance: 155 },
                { number: 16, par: 5, handicap: 6, distance: 530 },
                { number: 17, par: 4, handicap: 12, distance: 405 },
                { number: 18, par: 4, handicap: 14, distance: 385 },
              ]
            }
          },
          {
            name: 'Bedford Valley',
            holes: {
              create: [
                { number: 1, par: 4, handicap: 11, distance: 385 },
                { number: 2, par: 5, handicap: 7, distance: 501 },
                { number: 3, par: 4, handicap: 13, distance: 354 },
                { number: 4, par: 3, handicap: 17, distance: 177 },
                { number: 5, par: 4, handicap: 9, distance: 395 },
                { number: 6, par: 4, handicap: 3, distance: 428 },
                { number: 7, par: 5, handicap: 1, distance: 574 },
                { number: 8, par: 3, handicap: 15, distance: 179 },
                { number: 9, par: 4, handicap: 5, distance: 380 },
                { number: 10, par: 4, handicap: 6, distance: 386 },
                { number: 11, par: 5, handicap: 8, distance: 517 },
                { number: 12, par: 3, handicap: 18, distance: 157 },
                { number: 13, par: 4, handicap: 10, distance: 408 },
                { number: 14, par: 4, handicap: 14, distance: 346 },
                { number: 15, par: 4, handicap: 4, distance: 422 },
                { number: 16, par: 5, handicap: 2, distance: 545 },
                { number: 17, par: 3, handicap: 16, distance: 182 },
                { number: 18, par: 4, handicap: 12, distance: 383 },
              ]
            }
          }
        ]
      },
      formatMultipliers: {
        create: [
          { formatName: 'Best Ball', multiplier: 0.9 },
          { formatName: '2 Man Best Ball', multiplier: 0.9 },
          { formatName: 'Scramble', multiplier: 0.5 },
          { formatName: '2 Man Scramble', multiplier: 0.5 },
          { formatName: 'Alternate Shot', multiplier: 0.5 },
          { formatName: 'Mod Alt Shot', multiplier: 0.5 },
          { formatName: 'Modified Alternate Shot', multiplier: 0.5 },
          { formatName: 'Chapman', multiplier: 0.6 },
          { formatName: 'Singles', multiplier: 1.0 },
          { formatName: '4-Man Team', multiplier: 1.0, isFourManTeam: true },
        ]
      },
      accommodations: {
        create: [
          { name: 'Villa 1', details: 'Near the clubhouse, 4 bedrooms' },
          { name: 'Villa 2', details: 'Near the clubhouse, 4 bedrooms' },
          { name: 'Villa 3', details: 'Near the 1st tee, 3 bedrooms' },
        ]
      }
    }
  });

  console.log('Created tournament:', tournament.id);

  // Create schedule
  const formats = await prisma.formatMultiplier.findMany({
    where: { tournamentId: tournament.id }
  });

  // Create tournament days
  const days = await prisma.schedule.createMany({
    data: [
      {
        tournamentId: tournament.id,
        day: 1,
        date: new Date('2023-05-18'),
      },
      {
        tournamentId: tournament.id,
        day: 2,
        date: new Date('2023-05-19'),
      },
      {
        tournamentId: tournament.id,
        day: 3,
        date: new Date('2023-05-20'),
      },
    ]
  });

  console.log('Created schedule days');

  // Get teams
  const teams = await prisma.team.findMany({
    where: { tournamentId: tournament.id },
    include: { players: true }
  });

  const homeTeamId = teams[0].id;
  const awayTeamId = teams[1].id;

  // Get courses
  const courses = await prisma.course.findMany({
    where: { tournamentId: tournament.id }
  });

  // Get schedules
  const scheduleDays = await prisma.schedule.findMany({
    where: { tournamentId: tournament.id },
    orderBy: { day: 'asc' }
  });

  // Create matches for all days based on different formats
  if (scheduleDays.length > 0 && formats.length > 0 && courses.length > 0) {
    const bestBallFormat = formats.find((f: any) => f.formatName === 'Best Ball');
    const scrambleFormat = formats.find((f: any) => f.formatName === 'Scramble');
    const altShotFormat = formats.find((f: any) => f.formatName === 'Alternate Shot');
    const chapmanFormat = formats.find((f: any) => f.formatName === 'Chapman');
    const singlesFormat = formats.find((f: any) => f.formatName === 'Singles');
    const fourManFormat = formats.find((f: any) => f.formatName === '4-Man Team');
    
    // Day 1 - Morning: Best Ball
    if (bestBallFormat) {
      await createMatches(
        tournament.id, 
        scheduleDays[0].id, 
        bestBallFormat.id,
        homeTeamId,
        awayTeamId,
        courses[0].id,  // Stoatin Brae
        new Date('2023-05-18T08:00:00Z'),
        10,  // minutes between tee times
        6    // number of matches
      );
    }
    
    // Day 1 - Afternoon: Scramble
    if (scrambleFormat) {
      await createMatches(
        tournament.id, 
        scheduleDays[0].id, 
        scrambleFormat.id,
        homeTeamId,
        awayTeamId,
        courses[1].id,  // Bedford Valley
        new Date('2023-05-18T13:30:00Z'),
        10,  // minutes between tee times
        6    // number of matches
      );
    }
    
    // Day 2 - Morning: Alternate Shot
    if (altShotFormat) {
      await createMatches(
        tournament.id, 
        scheduleDays[1].id, 
        altShotFormat.id,
        homeTeamId,
        awayTeamId,
        courses[0].id,  // Stoatin Brae
        new Date('2023-05-19T08:00:00Z'),
        10,  // minutes between tee times
        6    // number of matches
      );
    }
    
    // Day 2 - Afternoon: Chapman
    if (chapmanFormat) {
      await createMatches(
        tournament.id, 
        scheduleDays[1].id, 
        chapmanFormat.id,
        homeTeamId,
        awayTeamId,
        courses[1].id,  // Bedford Valley
        new Date('2023-05-19T13:30:00Z'),
        10,  // minutes between tee times
        6    // number of matches
      );
    }
    
    // Day 3 - Singles Matches
    if (singlesFormat) {
      await createMatches(
        tournament.id, 
        scheduleDays[2].id, 
        singlesFormat.id,
        homeTeamId,
        awayTeamId,
        courses[0].id,  // Stoatin Brae
        new Date('2023-05-20T09:00:00Z'),
        8,   // minutes between tee times
        12   // number of matches (singles)
      );
    }
  }

  // Create some other users with different roles
  await prisma.user.upsert({
    where: { email: 'captain@gulllakegolf.com' },
    update: {
      password: await bcrypt.hash('password123', 10),
      role: 'TEAM_CAPTAIN'
    },
    create: {
      email: 'captain@gulllakegolf.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Dan Quaglia',
      role: 'TEAM_CAPTAIN',
    }
  });

  await prisma.user.upsert({
    where: { email: 'player@gulllakegolf.com' },
    update: {
      password: await bcrypt.hash('password123', 10),
      role: 'PLAYER'
    },
    create: {
      email: 'player@gulllakegolf.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Gary Gross',
      role: 'PLAYER',
    }
  });
  
  // Create a dummy tournament with all players opted into buy-ins, CTP, and skins
  console.log('Creating demo tournament with full buy-ins...');
  
  // Create Tournament with buy-ins
  const demoTournament = await prisma.tournament.create({
    data: {
      name: 'Demo Tournament 2025',
      year: 2025,
      location: 'Gull Lake',
      startDate: new Date('2025-05-18'),
      endDate: new Date('2025-05-20'),
      buyIn: 100,
      hasCTP: true,
      ctpPrizeAmount: 20,
      hasSkins: true,
      skinsPrizeAmount: 20,
      payoutStructure: {
        "1": 50,
        "2": 30,
        "3": 20
      },
      teams: {
        create: [
          { 
            name: 'Team Red',
            metadata: { isHomeTeam: true },
            players: {
              create: [
                { name: 'Player Red 1', handicapIndex: 8.2 },
                { name: 'Player Red 2', handicapIndex: 12.4 },
                { name: 'Player Red 3', handicapIndex: 9.3 },
                { name: 'Player Red 4', handicapIndex: 14.5 },
              ]
            }
          },
          { 
            name: 'Team Blue',
            metadata: { isHomeTeam: false },
            players: {
              create: [
                { name: 'Player Blue 1', handicapIndex: 7.1 },
                { name: 'Player Blue 2', handicapIndex: 11.9 },
                { name: 'Player Blue 3', handicapIndex: 10.2 },
                { name: 'Player Blue 4', handicapIndex: 16.3 },
              ]
            }
          }
        ]
      },
      courses: {
        create: {
          name: 'Demo Golf Course',
          holes: {
            create: [
              // Front 9
              { number: 1, par: 4, handicap: 7, distance: 410, isPar3: false },
              { number: 2, par: 3, handicap: 15, distance: 170, isPar3: true },
              { number: 3, par: 5, handicap: 1, distance: 550, isPar3: false },
              { number: 4, par: 4, handicap: 5, distance: 420, isPar3: false },
              { number: 5, par: 3, handicap: 17, distance: 160, isPar3: true },
              { number: 6, par: 4, handicap: 11, distance: 390, isPar3: false },
              { number: 7, par: 4, handicap: 9, distance: 400, isPar3: false },
              { number: 8, par: 5, handicap: 3, distance: 530, isPar3: false },
              { number: 9, par: 3, handicap: 13, distance: 190, isPar3: true },
              // Back 9
              { number: 10, par: 4, handicap: 8, distance: 415, isPar3: false },
              { number: 11, par: 3, handicap: 16, distance: 175, isPar3: true },
              { number: 12, par: 5, handicap: 2, distance: 545, isPar3: false },
              { number: 13, par: 4, handicap: 6, distance: 425, isPar3: false },
              { number: 14, par: 3, handicap: 18, distance: 155, isPar3: true },
              { number: 15, par: 4, handicap: 12, distance: 385, isPar3: false },
              { number: 16, par: 4, handicap: 10, distance: 405, isPar3: false },
              { number: 17, par: 5, handicap: 4, distance: 525, isPar3: false },
              { number: 18, par: 3, handicap: 14, distance: 185, isPar3: true },
            ]
          }
        }
      },
      formatMultipliers: {
        create: [
          { formatName: 'Singles', multiplier: 1.0, points: 1.0, halfPoints: 0.5 },
          { formatName: 'Best Ball', multiplier: 0.9, points: 1.0, halfPoints: 0.5 },
          { formatName: 'Alternate Shot', multiplier: 0.5, points: 1.0, halfPoints: 0.5 },
          { formatName: 'Chapman', multiplier: 0.6, points: 1.0, halfPoints: 0.5 },
          { formatName: 'Scramble', multiplier: 0.2, points: 1.0, halfPoints: 0.5 },
          { formatName: '4-Man Team', multiplier: 0.8, points: 1.0, halfPoints: 0.5, isFourManTeam: true }
        ]
      },
      schedules: {
        create: [
          { day: 1, date: new Date('2025-05-18') },
          { day: 2, date: new Date('2025-05-19') },
          { day: 3, date: new Date('2025-05-20') }
        ]
      }
    }
  });
  
  console.log('Demo tournament created:', demoTournament.name);
  
  // Fetch all players from the demo tournament
  const demoPlayers = await prisma.player.findMany({
    where: {
      team: {
        tournamentId: demoTournament.id
      }
    }
  });
  
  console.log(`Found ${demoPlayers.length} players to add payments for`);
  
  // Create all payment records for these players (buy-in, CTP, skins)
  const paymentPromises = demoPlayers.flatMap(player => [
    // Buy-in payment
    prisma.playerPayment.create({
      data: {
        tournamentId: demoTournament.id,
        playerId: player.id,
        amount: 100,
        type: 'BUY_IN',
        status: 'PAID',
        notes: 'Auto-created for demo'
      }
    }),
    // CTP entry payment
    prisma.playerPayment.create({
      data: {
        tournamentId: demoTournament.id,
        playerId: player.id,
        amount: 20,
        type: 'CTP_ENTRY',
        status: 'PAID',
        notes: 'Auto-created for demo'
      }
    }),
    // Skins entry payment
    prisma.playerPayment.create({
      data: {
        tournamentId: demoTournament.id,
        playerId: player.id,
        amount: 20,
        type: 'SKINS_ENTRY',
        status: 'PAID',
        notes: 'Auto-created for demo'
      }
    })
  ]);
  
  await Promise.all(paymentPromises);
  console.log(`Created ${paymentPromises.length} payment records for demo players`);
  
  // Create demo matches
  // Get teams from demo tournament
  const demoTeams = await prisma.team.findMany({
    where: { tournamentId: demoTournament.id }
  });
  
  // Parse and check metadata for home/away team
  const demoHomeTeamId = demoTeams.find(t => {
    if (typeof t.metadata === 'object' && t.metadata !== null) {
      const metadata = t.metadata as { isHomeTeam?: boolean };
      return metadata.isHomeTeam === true;
    }
    return false;
  })?.id || demoTeams[0].id;
  
  const demoAwayTeamId = demoTeams.find(t => {
    if (typeof t.metadata === 'object' && t.metadata !== null) {
      const metadata = t.metadata as { isHomeTeam?: boolean };
      return metadata.isHomeTeam !== true;
    }
    return true;
  })?.id || demoTeams[1].id;
  
  // Get course
  const demoCourse = await prisma.course.findFirst({
    where: { tournamentId: demoTournament.id }
  });
  
  // Get formats
  const demoFormats = await prisma.formatMultiplier.findMany({
    where: { tournamentId: demoTournament.id }
  });
  
  // Get schedules
  const demoSchedules = await prisma.schedule.findMany({
    where: { tournamentId: demoTournament.id },
    orderBy: { day: 'asc' }
  });
  
  if (demoSchedules.length > 0 && demoFormats.length > 0 && demoCourse) {
    // Singles format matches
    const singlesFormat = demoFormats.find(f => f.formatName === 'Singles');
    if (singlesFormat) {
      // Create singles matches
      await createMatches(
        demoTournament.id,
        demoSchedules[0].id,
        singlesFormat.id,
        demoHomeTeamId,
        demoAwayTeamId,
        demoCourse.id,
        new Date('2025-05-18T09:00:00Z'),
        10,  // minutes between tee times
        4    // number of matches (one for each player)
      );
    }
    
    // Best ball matches
    const bestBallFormat = demoFormats.find(f => f.formatName === 'Best Ball');
    if (bestBallFormat) {
      // Create best ball matches
      await createMatches(
        demoTournament.id,
        demoSchedules[1].id,
        bestBallFormat.id,
        demoHomeTeamId,
        demoAwayTeamId,
        demoCourse.id,
        new Date('2025-05-19T09:00:00Z'),
        10,  // minutes between tee times
        2    // number of matches (pairs of players)
      );
    }
    
    // Four-man team match
    const fourManFormat = demoFormats.find(f => f.formatName === '4-Man Team');
    if (fourManFormat) {
      // Create a four-man team match
      await createMatches(
        demoTournament.id,
        demoSchedules[2].id,
        fourManFormat.id,
        demoHomeTeamId,
        demoAwayTeamId,
        demoCourse.id,
        new Date('2025-05-20T09:00:00Z'),
        10,  // minutes between tee times
        1    // just one match with all players
      );
    }
  }
  
  console.log('Demo matches created successfully');
  
  // Assign players to matches
  // Get all players in the demo tournament
  const redTeamPlayers = await prisma.player.findMany({
    where: {
      team: {
        tournamentId: demoTournament.id,
        name: 'Team Red'
      }
    }
  });
  
  const blueTeamPlayers = await prisma.player.findMany({
    where: {
      team: {
        tournamentId: demoTournament.id,
        name: 'Team Blue'
      }
    }
  });
  
  // Get all matches in the demo tournament
  const demoMatches = await prisma.match.findMany({
    where: {
      tournamentId: demoTournament.id
    },
    include: {
      format: true
    },
    orderBy: [
      { scheduleId: 'asc' },
      { teeTime: 'asc' }
    ]
  });
  
  // Assign players to matches based on format
  for (let i = 0; i < demoMatches.length; i++) {
    const match = demoMatches[i];
    
    // Singles format - one player from each team
    if (match.format.formatName === 'Singles') {
      // Get one player from each team for this match
      const homePlayerIndex = i % redTeamPlayers.length;
      const awayPlayerIndex = i % blueTeamPlayers.length;
      
      // Create player pairings
      await prisma.playerPairing.createMany({
        data: [
          {
            matchId: match.id,
            playerId: redTeamPlayers[homePlayerIndex].id,
            isHomeTeam: true,
            pairingGroup: 1
          },
          {
            matchId: match.id,
            playerId: blueTeamPlayers[awayPlayerIndex].id,
            isHomeTeam: false,
            pairingGroup: 1
          }
        ]
      });
    }
    // Best Ball format - two players from each team
    else if (match.format.formatName === 'Best Ball') {
      // For the first match, use players 0 and 1
      // For the second match, use players 2 and 3
      const startIndex = (i % 2) * 2;
      
      // Create player pairings for the two home players
      await prisma.playerPairing.createMany({
        data: [
          {
            matchId: match.id,
            playerId: redTeamPlayers[startIndex].id,
            isHomeTeam: true,
            pairingGroup: 1
          },
          {
            matchId: match.id,
            playerId: redTeamPlayers[startIndex + 1].id,
            isHomeTeam: true,
            pairingGroup: 1
          },
          {
            matchId: match.id,
            playerId: blueTeamPlayers[startIndex].id,
            isHomeTeam: false,
            pairingGroup: 1
          },
          {
            matchId: match.id,
            playerId: blueTeamPlayers[startIndex + 1].id,
            isHomeTeam: false,
            pairingGroup: 1
          }
        ]
      });
    }
    // 4-Man Team format - all players from each team
    else if (match.format.formatName === '4-Man Team') {
      // Add all players from both teams
      const playerPairingData = [
        ...redTeamPlayers.map(player => ({
          matchId: match.id,
          playerId: player.id,
          isHomeTeam: true,
          pairingGroup: 1
        })),
        ...blueTeamPlayers.map(player => ({
          matchId: match.id,
          playerId: player.id,
          isHomeTeam: false,
          pairingGroup: 1
        }))
      ];
      
      await prisma.playerPairing.createMany({
        data: playerPairingData
      });
    }
  }
  
  console.log('Demo player assignments created successfully');
  
  console.log('Seed completed successfully');
}

// Helper function to create multiple matches with incrementing tee times
async function createMatches(
  tournamentId: string,
  scheduleId: string,
  formatId: string,
  homeTeamId: string,
  awayTeamId: string,
  courseId: string,
  startTime: Date,
  minutesBetweenTeeTime: number,
  numberOfMatches: number
) {
  const matchData = [];
  
  for (let i = 0; i < numberOfMatches; i++) {
    const teeTime = new Date(startTime);
    teeTime.setMinutes(teeTime.getMinutes() + (i * minutesBetweenTeeTime));
    
    matchData.push({
      tournamentId,
      scheduleId,
      formatId,
      homeTeamId,
      awayTeamId, 
      courseId,
      startingHole: 1,
      teeTime,
    });
  }
  
  await prisma.match.createMany({
    data: matchData
  });
  
  console.log(`Created ${numberOfMatches} matches`);
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });