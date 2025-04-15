import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, name, handicapIndex } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with PLAYER role by default
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'PLAYER',
      }
    });

    // Create player profile if handicapIndex is provided
    if (handicapIndex !== undefined) {
      // Find the "Invited Guests" team or create it if it doesn't exist
      let guestTeam = await prisma.team.findFirst({
        where: { name: 'Invited Guests' }
      });

      if (!guestTeam) {
        // Find the first tournament to associate team with
        const tournament = await prisma.tournament.findFirst({
          orderBy: { startDate: 'desc' }
        });

        if (tournament) {
          guestTeam = await prisma.team.create({
            data: {
              name: 'Invited Guests',
              tournamentId: tournament.id
            }
          });
        }
      }

      if (guestTeam) {
        await prisma.player.create({
          data: {
            name,
            email,
            handicapIndex: parseFloat(handicapIndex),
            teamId: guestTeam.id
          }
        });
      }
    }

    // Don't include password in response
    const { password: _, ...userWithoutPassword } = user;

    return res.status(201).json({
      user: userWithoutPassword,
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}