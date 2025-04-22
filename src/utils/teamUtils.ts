/**
 * Utility functions for handling team-related operations
 */

/**
 * Determines if a team is a home team based on team data
 * 
 * Handles the various ways isHomeTeam might be stored:
 * - Direct property: team.isHomeTeam
 * - In metadata: team.metadata.isHomeTeam
 * - Parsed metadata JSON: JSON.parse(team.metadata).isHomeTeam
 * 
 * @param team The team object to check
 * @returns boolean indicating if it's a home team
 */
export function isHomeTeam(team: any): boolean {
  if (!team) return false;
  
  // Log for debugging
  console.log(`Checking isHomeTeam for team: ${team.name || 'Unknown'} (${team.id || 'no-id'})`);
  
  // Direct property
  if (typeof team.isHomeTeam === 'boolean') {
    console.log(`  Direct isHomeTeam property found: ${team.isHomeTeam}`);
    return team.isHomeTeam;
  }
  
  // Check in metadata (object format)
  if (team.metadata && typeof team.metadata === 'object' && team.metadata !== null) {
    console.log(`  Object metadata found, isHomeTeam: ${!!team.metadata.isHomeTeam}`);
    return !!team.metadata.isHomeTeam;
  }
  
  // Check in metadata (string format)
  if (team.metadata && typeof team.metadata === 'string') {
    try {
      const parsedMetadata = JSON.parse(team.metadata);
      console.log(`  String metadata parsed, isHomeTeam: ${!!parsedMetadata.isHomeTeam}`);
      return !!parsedMetadata.isHomeTeam;
    } catch (e) {
      console.log(`  Error parsing string metadata: ${e}`);
      // Invalid JSON, ignore
    }
  }
  
  // Default: Guess based on name (fallback for development only)
  if (team.name) {
    const lowerName = team.name.toLowerCase();
    const nameBasedGuess = lowerName.includes('spartan') || 
                          lowerName.includes('home') || 
                          lowerName.includes('host');
    
    console.log(`  Guessing based on name: ${team.name} -> isHomeTeam: ${nameBasedGuess}`);
    
    if (nameBasedGuess) {
      return true;
    }
  }
  
  console.log(`  No home team indicators found for ${team.name || 'Unknown team'}, defaulting to false`);
  return false;
}

/**
 * Sets the isHomeTeam property in team metadata
 * 
 * @param team The team object to update
 * @param isHome Boolean indicating if it's a home team
 * @returns Updated metadata object
 */
export function setHomeTeam(team: any, isHome: boolean): any {
  if (!team) return {};
  
  // Start with existing metadata
  let metadata = team.metadata || {};
  
  // If it's a string, try to parse it
  if (typeof metadata === 'string') {
    try {
      metadata = JSON.parse(metadata);
    } catch (e) {
      metadata = {};
    }
  }
  
  // Set the isHomeTeam property
  return {
    ...metadata,
    isHomeTeam: isHome
  };
}

/**
 * Gets the appropriate team ID based on whether it's a home team or not
 * Useful for determining whether to use homeTeamId or awayTeamId
 * 
 * @param homeTeamId The home team ID
 * @param awayTeamId The away team ID
 * @param isHome Boolean indicating if we want the home team
 * @returns The appropriate team ID
 */
export function getTeamIdByHomeStatus(homeTeamId: string, awayTeamId: string, isHome: boolean): string {
  return isHome ? homeTeamId : awayTeamId;
}