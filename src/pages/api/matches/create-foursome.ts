import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { MatchService, FoursomeCreateParams } from '@/services/match/matchService';
import { verifyToken } from '@/utils/auth';
import { sendError, sendSuccess, sendValidationError, sendMethodNotAllowed } from '@/services/api/apiResponse';

const prisma = new PrismaClient();
const matchService = new MatchService();

interface FoursomeCreationPayload extends FoursomeCreateParams {
  placeholderMatchId: string; // ID of the placeholder match to potentially delete
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Authentication
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  if (!verifyToken(token, res)) {
    return; // verifyToken sends response on failure
  }

  if (req.method !== 'POST') {
    return sendMethodNotAllowed(res, ['POST']);
  }

  const { foursomes } = req.body;

  if (!Array.isArray(foursomes) || foursomes.length === 0) {
    return sendValidationError(res, 'Invalid input. Expected a non-empty "foursomes" array.');
  }

  const results = [];
  let overallSuccess = true;

  for (const foursomeData of foursomes as FoursomeCreationPayload[]) {
    const { placeholderMatchId, ...params } = foursomeData;

    try {
      // --- Check if the two player-vs-player matches already exist ---
      const existingMatchesCount = await prisma.match.count({
        where: {
          tournamentId: params.tournamentId,
          scheduleId: params.scheduleId,
          teeTime: new Date(params.teeTime), // Ensure correct Date comparison
          homeTeamId: params.homeTeamId,
          awayTeamId: params.awayTeamId,
          startingHole: params.startingHole,
          playerToPlayerMatch: true, // Look specifically for the individual matches
          // We don't need to check formatId here if we assume the combo above is unique enough
        },
      });

      if (existingMatchesCount >= 2) {
        console.log(`Foursome matches for teeTime ${params.teeTime} seem to already exist (${existingMatchesCount} found). Skipping creation, attempting to delete placeholder ${placeholderMatchId}.`);
        // Optionally delete the placeholder even if matches exist, to clean up
        try {
           await prisma.match.delete({ where: { id: placeholderMatchId }});
           console.log(`Deleted existing placeholder match ${placeholderMatchId}.`);
           results.push({ placeholderMatchId, status: 'skipped_deleted_placeholder', message: 'Matches likely existed already. Deleted placeholder.' });
        } catch (deleteError) {
           console.error(`Error deleting placeholder ${placeholderMatchId} after skipping creation:`, deleteError);
           // Don't mark overall as failure, but log the issue.
           results.push({ placeholderMatchId, status: 'skipped_placeholder_delete_failed', message: 'Matches likely existed already. Failed to delete placeholder.' });
        }
        continue; // Move to the next foursome in the loop
      } else if (existingMatchesCount === 1) {
         // This is an unexpected state (only one of the pair exists)
         console.error(`Inconsistent state for foursome at teeTime ${params.teeTime}. Found 1 existing player-vs-player match, expected 0 or 2. Skipping creation.`);
         results.push({ placeholderMatchId, status: 'skipped_inconsistent_state', message: 'Inconsistent state: found only one existing match.' });
         overallSuccess = false; // Mark as failure due to inconsistency
         continue;
      }

      // --- Create the Foursome (Two new Match records) ---
      console.log(`Creating foursome matches for teeTime ${params.teeTime}...`);
      
      // Use a transaction to create matches and delete placeholder atomically
      const transactionResult = await prisma.$transaction(async (tx) => {
        // 1. Create the two new matches
        const creationResult = await matchService.createFoursome(params); // Assuming createFoursome doesn't use tx internally yet

        if (!creationResult || !creationResult.success) {
          throw new Error('matchService.createFoursome failed internally.');
        }
        
        console.log(`Successfully created ${creationResult.matches.length} matches with foursomeGroupId ${creationResult.foursomeGroupId}.`);

        // 2. Delete the original placeholder match
        console.log(`Deleting placeholder match ${placeholderMatchId}...`);
        await tx.match.delete({
          where: { id: placeholderMatchId },
        });
        console.log(`Successfully deleted placeholder match ${placeholderMatchId}.`);
        
        return creationResult;
      });

      results.push({ placeholderMatchId, status: 'created', data: transactionResult });

    } catch (error: any) {
      console.error(`Error processing foursome creation for placeholder ${placeholderMatchId}:`, error);
      results.push({ placeholderMatchId, status: 'error', message: error.message || 'Unknown error during foursome creation.' });
      overallSuccess = false;
    }
  }

  // Determine final status code
  const statusCode = overallSuccess ? 200 : (results.some(r => r.status === 'created') ? 207 : 500); // 200 OK, 207 Multi-Status, 500 Server Error

  return res.status(statusCode).json({
    message: overallSuccess ? 'Foursome processing completed.' : 'Foursome processing completed with errors.',
    results,
  });
}