/**
 * Utility functions for handicap calculations
 */

/**
 * Apply format multiplier to a handicap
 * @deprecated This logic is now integrated into calculateTeamHandicap
 */
// export function applyFormatMultiplier(handicap: number, formatMultiplier: number): number {
//   return handicap * formatMultiplier;
// }

/**
 * Determine if a stroke should be given on a specific hole based on player handicap
 * and hole handicap index (match play rules)
 * 
 * @param playerHandicap The player's handicap (can be team handicap)
 * @param holeHandicapIndex The hole's handicap index (1-18, where 1 is most difficult)
 * @returns The number of strokes the player gets on this hole (0, 1, or more for very high handicaps)
 */
export function getStrokesOnHole(playerHandicap: number, holeHandicapIndex: number): number {
  // Round the handicap up to nearest integer for match play
  const roundedHandicap = Math.ceil(playerHandicap);
  
  // No strokes if handicap is 0 or negative
  if (roundedHandicap <= 0) return 0;
  
  // For handicaps 1-18, give one stroke on holes with index <= handicap
  if (roundedHandicap <= 18) {
    return holeHandicapIndex <= roundedHandicap ? 1 : 0;
  }
  
  // For handicaps > 18, give multiple strokes on some holes
  // First get base strokes (1 stroke on each hole)
  let strokes = 1;
  
  // Then add additional strokes based on remaining handicap
  const remainingHandicap = roundedHandicap - 18;
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
 * Calculate net score based on gross score and course handicap for a hole
 * Uses proper match play allocation of strokes based on hole handicap index
 * For 4-man team events, no handicap is applied
 */
export function calculateNetScore(
  grossScore: number,
  handicap: number,
  holeHandicapIndex: number,
  isFourManTeam: boolean = false
): number {
  if (grossScore === null || grossScore === undefined) return 0;
  
  // For 4-man team events, return gross score directly
  if (isFourManTeam) {
    return grossScore;
  }
  
  // Get strokes for this hole based on handicap and hole index
  const strokesOnHole = getStrokesOnHole(handicap, holeHandicapIndex);
  
  // Apply strokes to gross score for match play
  const netScore = Math.max(1, grossScore - strokesOnHole);
  
  // For match play, we use integers, not decimals
  return Math.round(netScore);
}

/**
 * Define the structure for team handicap format configuration.
 * This object would typically be populated from database data.
 */
// export interface TeamHandicapFormat {
//   // Identifier for the format (e.g., fetched from DB) - Not directly used in calculation but good practice
//   id?: string | number; 
//   name?: string; // e.g., "2 Man Best Ball" - For reference, not used in calculation logic
//   
//   // Type of calculation method
//   calculationType: 'SINGLES' | 'LOWEST_PERCENTAGE' | 'AVERAGE' | 'WEIGHTED_LOW_HIGH' | 'WEIGHTED_PAIR';

//   // Parameters specific to the calculation type
//   params: {
//     // Used for LOWEST_PERCENTAGE (e.g., 0.9 for Best Ball)
//     percentage?: number;       
//     // Used for WEIGHTED_LOW_HIGH (e.g., 0.35 low, 0.15 high for Scramble)
//     // Also used for WEIGHTED_PAIR (e.g., 0.6 low, 0.4 high for Chapman)
//     lowPercentage?: number;    
//     highPercentage?: number;   
//   };
//   
//   // Optional overall multiplier applied AFTER the main calculation (Defaults to 1)
//   // Example: Used in Alternate Shot where average is calculated, then multiplied by 0.7
//   formatMultiplier?: number; 
// }

/**
 * Calculate team handicap based on the average of player handicaps and a format multiplier.
 * If the format is designated as a 4-man team event, no handicap is applied (returns 0).
 * The multiplier and isFourManTeam flag should be sourced from the FormatMultiplier model.
 */
export function calculateTeamHandicap(
  playerHandicaps: number[],
  formatMultiplier: number,
  isFourManTeam: boolean = false
): number {
  // For 4-man team events, no handicap is applied
  if (isFourManTeam) {
    return 0;
  }

  if (!playerHandicaps || playerHandicaps.length === 0) return 0;
  
  // Calculate the average handicap of the players
  const sum = playerHandicaps.reduce((a, b) => a + b, 0);
  const averageHandicap = sum / playerHandicaps.length;
  
  // Apply the format-specific multiplier
  // We don't round here; rounding happens later if needed (e.g., getStrokesOnHole)
  return averageHandicap * formatMultiplier;
}

/**
 * Determine hole winner based on net scores
 */
export function determineHoleWinner(homeNetScore: number, awayNetScore: number): 'home' | 'away' | 'tie' {
  if (homeNetScore === null || awayNetScore === null) return 'tie';
  
  if (homeNetScore < awayNetScore) {
    return 'home';
  } else if (awayNetScore < homeNetScore) {
    return 'away';
  } else {
    return 'tie';
  }
}