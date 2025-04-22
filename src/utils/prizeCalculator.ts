/**
 * Utility functions for calculating tournament prizes
 */

/**
 * Calculate the prize per CTP hole based on tournament parameters
 * @param ctpEntryFee The CTP entry fee amount per player
 * @param participantCount Number of players who paid for CTP entry
 * @param par3Count Number of par 3 holes in scheduled courses
 * @returns Prize amount per CTP hole
 */
export function calculateCTPPrize(
  ctpEntryFee: number,
  participantCount: number,
  par3Count: number
): number {
  if (!ctpEntryFee || !participantCount || !par3Count) return 0;
  
  // Calculate total pot (participants * CTP entry fee) and divide by number of par 3 holes
  const totalPot = ctpEntryFee * participantCount;
  // Round to 2 decimal places for precise dollar amount
  return Math.round((totalPot / par3Count) * 100) / 100;
}

/**
 * Calculate the prize per skin based on tournament parameters
 * @param skinsEntryFee The skins entry fee amount per player
 * @param participantCount Number of players who paid for skins entry
 * @param skinCount Number of skins won in the tournament or event
 * @returns Prize amount per skin or total pot if no skins
 */
export function calculateSkinsPrize(
  skinsEntryFee: number,
  participantCount: number,
  skinCount: number
): number {
  if (!skinsEntryFee || !participantCount) return 0;
  
  // Calculate total pot (participants * skins entry fee)
  const totalPot = skinsEntryFee * participantCount;
  
  // If no skins recorded yet, just return the pot amount (rounded to 2 decimal places)
  if (!skinCount) return Math.round(totalPot * 100) / 100;
  
  // Otherwise divide by number of skins
  // Round to 2 decimal places for precise dollar amount
  return Math.round((totalPot / skinCount) * 100) / 100;
}

/**
 * Calculate team payout amounts based on tournament parameters
 * @param buyIn The tournament buy-in amount per player
 * @param playerCount Total number of players in the tournament
 * @param payoutStructure Object mapping places to percentage of prize pool
 * @param teamCount Number of teams in the tournament
 * @returns Object mapping places to dollar amounts
 */
export function calculateTeamPayouts(
  buyIn: number,
  playerCount: number,
  payoutStructure: Record<string, number>,
  teamCount: number
): Record<string, number> {
  if (!buyIn || !playerCount || !payoutStructure) return {};
  
  const totalPrize = buyIn * playerCount;
  const payouts: Record<string, number> = {};
  
  // Only include payouts for places up to teamCount
  Object.entries(payoutStructure)
    .filter(([place]) => Number(place) <= teamCount)
    .forEach(([place, percentage]) => {
      // Round to 2 decimal places for precise dollar amount
      payouts[place] = Math.round((totalPrize * (percentage / 100)) * 100) / 100;
    });
  
  return payouts;
}