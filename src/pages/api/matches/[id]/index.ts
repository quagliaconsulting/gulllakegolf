import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/utils/auth'; // Assuming you have auth middleware

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Optional: Verify user authentication
  // const userId = await verifyToken(req);
  // if (!userId) {
  //   return res.status(401).json({ message: 'Unauthorized' });
  // }

  const { id: matchId } = req.query;

  if (typeof matchId !== 'string') {
    return res.status(400).json({ message: 'Invalid Match ID' });
  }

  if (req.method === 'DELETE') {
    try {
      // Check if match exists before deleting (optional but good practice)
      const existingMatch = await prisma.match.findUnique({
        where: { id: matchId },
      });

      if (!existingMatch) {
        return res.status(404).json({ message: 'Match not found' });
      }

      // Delete associated PlayerPairings first if necessary (depending on schema relations)
      await prisma.playerPairing.deleteMany({
        where: { matchId: matchId },
      });
      
      // Delete associated MatchPoints if necessary (depending on schema relations)
       await prisma.matchPoints.deleteMany({
        where: { matchId: matchId },
      });

      // Now delete the match
      await prisma.match.delete({
        where: { id: matchId },
      });

      console.log(`Match deleted successfully: ${matchId}`);
      return res.status(204).end(); // No Content response for successful deletion
    } catch (error) {
      console.error(`Error deleting match ${matchId}:`, error);
      // Check for specific Prisma errors if needed
      // if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      //   return res.status(404).json({ message: 'Match not found or already deleted' });
      // }
      return res.status(500).json({ message: 'Error deleting match', error: error instanceof Error ? error.message : String(error) });
    }
  } else {
    // Handle other methods or return Method Not Allowed
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 