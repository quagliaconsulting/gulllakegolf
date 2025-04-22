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
 * Calculate the number of handicap strokes a player gets on a specific hole.
 * This implements standard USGA match play handicap rules where:
 * - For handicaps 1-18: Player gets 1 stroke on the N hardest holes where N is their handicap
 * - For handicaps 19-36: Player gets 1 stroke on all holes, plus an extra stroke on the M hardest
 *   where M is (handicap-18)
 * - For handicaps over 36: Pattern continues with 2 strokes on all holes, then 3, etc.
 * 
 * @param playerHandicap The player's handicap (can be team handicap)
 * @param holeHandicapIndex The hole's handicap index (1-18, where 1 is most difficult)
 * @returns The number of strokes the player gets on this hole (0, 1, or more for very high handicaps)
 */
export function getStrokesOnHole(playerHandicap: number, holeHandicapIndex: number): number {
  // Round the handicap for match play (using ceiling to ensure proper stroke allocation)
  // This ensures a 10.2 handicap gets strokes on the 11 hardest holes
  const roundedHandicap = Math.ceil(playerHandicap);
  
  // Validate inputs
  if (roundedHandicap <= 0) return 0; // No strokes for zero or negative handicaps
  if (holeHandicapIndex < 1 || holeHandicapIndex > 18) {
    console.warn(`Invalid hole handicap index: ${holeHandicapIndex}. Must be 1-18. Assuming 18.`);
    holeHandicapIndex = Math.max(1, Math.min(18, holeHandicapIndex));
  }
  
  // Calculate how many complete sets of 18 holes this player gets strokes on
  const completeSets = Math.floor(roundedHandicap / 18);
  
  // Calculate the remaining handicap after allocating complete sets
  const remainingHandicap = roundedHandicap % 18;
  
  // Base strokes from complete sets (player gets completeSets strokes on every hole)
  let strokes = completeSets;
  
  // Add one more stroke if this hole's index is <= the remaining handicap
  // For example, with handicap 20, player gets 1 stroke on all holes, plus an extra
  // stroke on the 2 hardest holes (index 1 and 2)
  if (remainingHandicap > 0 && holeHandicapIndex <= remainingHandicap) {
    strokes += 1;
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
 * Calculate team handicap based on the format type, player handicaps, and format multiplier.
 * Different formats use different calculation methods:
 * - Singles: Individual player handicap (multiplier = 1.0)
 * - Best Ball: Low handicap × multiplier (multiplier = 0.9)
 * - Alternate Shot: Average handicap × multiplier (multiplier = 0.7) 
 * - Chapman: Weighted sum of low and high handicap × multiplier (multiplier = 0.6)
 * - Scramble: Average handicap × multiplier (multiplier = 0.4)
 * - 4-Man Team: No handicap applied (returns 0)
 * 
 * The multiplier and isFourManTeam flag should be sourced from the FormatMultiplier model in the database.
 */
export function calculateTeamHandicap(
  playerHandicaps: number[],
  formatMultiplier: number,
  isFourManTeam: boolean = false,
  formatName?: string  // Optional format name for specialized calculations
): number {
  // For 4-man team events, no handicap is applied
  if (isFourManTeam) {
    console.log("4-Man Team format: No handicap applied");
    return 0;
  }

  if (!playerHandicaps || playerHandicaps.length === 0) return 0;
  
  // Sort handicaps for calculations that need low/high values
  const sortedHandicaps = [...playerHandicaps].sort((a, b) => a - b);
  
  let teamHandicap = 0;
  
  // Format-specific calculations
  if (formatName === 'Singles' && playerHandicaps.length === 1) {
    // Singles: Use the player's handicap directly
    teamHandicap = playerHandicaps[0];
    console.log(`Singles format: Using player handicap ${teamHandicap}`);
  } 
  else if (formatName === 'Best Ball' && playerHandicaps.length > 0) {
    // Best Ball: Average of player handicaps (then will apply 0.9 multiplier from DB)
    const sum = playerHandicaps.reduce((a, b) => a + b, 0);
    teamHandicap = sum / playerHandicaps.length;
    console.log(`Best Ball format: Average handicap (${playerHandicaps.join(', ')}) = ${teamHandicap}`);
  }
  else if (formatName === 'Chapman' && playerHandicaps.length >= 2) {
    // Chapman: Average of player handicaps (then will apply 0.6 multiplier from DB)
    const sum = playerHandicaps.reduce((a, b) => a + b, 0);
    teamHandicap = sum / playerHandicaps.length;
    console.log(`Chapman format: Average handicap (${playerHandicaps.join(', ')}) = ${teamHandicap}`);
  }
  else if (formatName === 'Scramble' && playerHandicaps.length >= 2) {
    // Scramble: Use the average of handicaps
    // The multiplier (usually 0.4 or similar) will be applied from the database
    const sum = playerHandicaps.reduce((a, b) => a + b, 0);
    teamHandicap = sum / playerHandicaps.length;
    console.log(`Scramble format: Average handicap (${playerHandicaps.join(', ')}) = ${teamHandicap}`);
  }
  else if (formatName === 'Alternate Shot' && playerHandicaps.length >= 2) {
    // Alternate Shot: Use the average of handicaps
    // The multiplier (usually 0.7) will be applied from the database
    const sum = playerHandicaps.reduce((a, b) => a + b, 0);
    teamHandicap = sum / playerHandicaps.length;
    console.log(`Alternate Shot format: Average handicap (${playerHandicaps.join(', ')}) = ${teamHandicap}`);
  }
  else {
    // Default calculation for other or unknown formats
    // Simply average the handicaps
    const sum = playerHandicaps.reduce((a, b) => a + b, 0);
    teamHandicap = sum / playerHandicaps.length;
    console.log(`Default calculation (${formatName || 'Unknown format'}): Average handicap ${teamHandicap}`);
  }
  
  // Apply the format-specific multiplier from the database
  const finalHandicap = teamHandicap * formatMultiplier;
  console.log(`Applied multiplier ${formatMultiplier}: Final handicap = ${finalHandicap}`);
  
  // We don't round here; rounding happens later if needed (e.g., in getStrokesOnHole)
  return finalHandicap;
}

/**
 * Determine hole winner based on net scores.
 * In match play, the lower net score wins the hole.
 * Equal net scores result in a tie (halved hole).
 * 
 * @param homeNetScore The home team's net score
 * @param awayNetScore The away team's net score
 * @returns 'home' if home team won, 'away' if away team won, 'tie' if tied
 */
export function determineHoleWinner(homeNetScore: number, awayNetScore: number): 'home' | 'away' | 'tie' {
  // Handle null values
  if (homeNetScore === null || awayNetScore === null) {
    console.log(`Incomplete scores: home=${homeNetScore}, away=${awayNetScore} → Result: tie`);
    return 'tie';
  }
  
  // Determine winner based on net scores
  if (homeNetScore < awayNetScore) {
    console.log(`Home wins hole: ${homeNetScore} vs ${awayNetScore}`);
    return 'home';
  } else if (awayNetScore < homeNetScore) {
    console.log(`Away wins hole: ${awayNetScore} vs ${homeNetScore}`);
    return 'away';
  } else {
    console.log(`Hole halved (tied): ${homeNetScore} vs ${awayNetScore}`);
    return 'tie';
  }
}