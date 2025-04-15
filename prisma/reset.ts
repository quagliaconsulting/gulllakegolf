import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('Starting database reset...');

  try {
    // Delete all records in the correct order to respect foreign key constraints
    console.log('Deleting PlayerPairing records...');
    await prisma.playerPairing.deleteMany({});
    
    console.log('Deleting HoleResult records...');
    await prisma.holeResult.deleteMany({});
    
    console.log('Deleting MatchPoints records...');
    await prisma.matchPoints.deleteMany({});
    
    console.log('Deleting Match records...');
    await prisma.match.deleteMany({});
    
    console.log('Deleting Schedule records...');
    await prisma.schedule.deleteMany({});
    
    console.log('Deleting Player records...');
    await prisma.player.deleteMany({});
    
    console.log('Deleting Team records...');
    await prisma.team.deleteMany({});
    
    console.log('Deleting Hole records...');
    await prisma.hole.deleteMany({});
    
    console.log('Deleting Course records...');
    await prisma.course.deleteMany({});
    
    console.log('Deleting FormatMultiplier records...');
    await prisma.formatMultiplier.deleteMany({});
    
    console.log('Deleting Accommodation records...');
    await prisma.accommodation.deleteMany({});
    
    console.log('Deleting Tournament records...');
    await prisma.tournament.deleteMany({});
    
    console.log('Deleting User records except the admin account...');
    // Delete all users except the admin account
    await prisma.user.deleteMany({
      where: {
        role: {
          not: 'ADMIN'
        }
      }
    });

    console.log('Reset complete - all data has been deleted');
    console.log('For a complete reset including admin users, run: npx prisma db push --force-reset');
    console.log('To re-seed the database, run: npm run prisma:seed');
  } catch (error) {
    console.error('Error during database reset:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset function
resetDatabase();