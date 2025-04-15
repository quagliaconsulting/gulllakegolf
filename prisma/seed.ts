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