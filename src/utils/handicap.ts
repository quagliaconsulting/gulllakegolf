/**
 * Utility functions for handicap calculations
 */

/**
 * Apply format multiplier to a handicap
 */
export function applyFormatMultiplier(handicap: number, formatMultiplier: number): number {
  return handicap * formatMultiplier;
}

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
 * Calculate team handicap based on player handicaps and format
 * Different formats use different calculations
 */
export function calculateTeamHandicap(
  playerHandicaps: number[],
  format: string
): number {
  if (!playerHandicaps || playerHandicaps.length === 0) return 0;

  switch (format.toLowerCase()) {
    case 'singles':
      // For Singles format, use 100% of the player's handicap
      if (playerHandicaps.length > 0) {
        return playerHandicaps[0]; // Simply use the player's full handicap
      }
      return 0;
      
    case 'best ball':
    case '2 man best ball':
      // Use 90% of the lowest handicap player
      const lowestHandicap = Math.min(...playerHandicaps);
      // We don't round up here - rounding is done in getStrokesOnHole
      return lowestHandicap * 0.9;
    
    case 'alternate shot':
    case 'mod alt shot':
    case 'modified alternate shot':
      // Average of the two players' handicaps
      const sum = playerHandicaps.reduce((a, b) => a + b, 0);
      // We don't round up here - rounding is done in getStrokesOnHole
      return sum / playerHandicaps.length;
    
    case 'scramble':
    case '2 man scramble':
      // Use 35% of the lowest handicap player, plus 15% of the highest
      if (playerHandicaps.length >= 2) {
        const sortedHandicaps = [...playerHandicaps].sort((a, b) => a - b);
        const lowest = sortedHandicaps[0];
        const highest = sortedHandicaps[sortedHandicaps.length - 1];
        // We don't round up here - rounding is done in getStrokesOnHole
        return (lowest * 0.35) + (highest * 0.15);
      }
      return playerHandicaps[0];
    
    case 'chapman':
      // Use 60% of the lower handicap player plus 40% of the higher handicap player
      if (playerHandicaps.length >= 2) {
        const sortedHandicaps = [...playerHandicaps].sort((a, b) => a - b);
        const lower = sortedHandicaps[0];
        const higher = sortedHandicaps[1];
        // We don't round up here - rounding is done in getStrokesOnHole
        return (lower * 0.6) + (higher * 0.4);
      }
      return playerHandicaps[0];
    
    default:
      // For unknown formats, use average
      const total = playerHandicaps.reduce((a, b) => a + b, 0);
      return total / playerHandicaps.length;
  }
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