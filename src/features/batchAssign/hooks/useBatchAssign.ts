import { useState, useEffect } from 'react';
import { useApi } from '@/services/api/apiClient';

export interface PlayerAssignment {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  format: string;
  homePlayers: string[]; // Initial selection (2 for singles)
  awayPlayers: string[]; // Initial selection (2 for singles)
  requiredPlayers: number; // Based on format (pairs=2, 4man=4, singles=2 for initial selection)
  allHomePlayers: any[];
  allAwayPlayers: any[];
  expanded: boolean;
  isPairsFormat?: boolean;
  isFourManTeam?: boolean;
  isSingles?: boolean;
  time?: string;
  course?: string;
  needsMatchups?: boolean; // Flag to show the matchup builder UI for singles
  playerMatchups?: {homeId: string, awayId: string}[]; // UI state for building the two 1v1 singles pairs
  homeTeamId?: string;
  awayTeamId?: string;
  formatId?: string;
  courseId?: string;
  startingHole?: number;
  teeTime?: string;
  scheduleId?: string;
}

export function useBatchAssign(tournamentId: string | undefined) {
  const [assignments, setAssignments] = useState<PlayerAssignment[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dayFilter, setDayFilter] = useState<string>('all');
  const [showFoursomeEditor, setShowFoursomeEditor] = useState(false);
  const [foursomeData, setFoursomeData] = useState<any>(null);

  // Fetch tournament data
  const { 
    data: tournamentData, 
    error: tournamentError 
  } = useApi(
    tournamentId ? `/api/tournaments/${tournamentId}` : null,
    { revalidateOnFocus: false }
  );

  // Fetch schedule data
  const { 
    data: scheduleData, 
    error: scheduleError,
    mutate: refreshSchedules 
  } = useApi(
    tournamentId ? `/api/tournaments/${tournamentId}/schedule` : null,
    { revalidateOnFocus: false }
  );

  // Helper to determine required players by format
  const getRequiredPlayersByFormat = (format: string) => {
    if (!format) return 2;
    
    const formatLower = format.toLowerCase();
    if (formatLower.includes('singles')) {
      return 2; // Singles requires 1 player per side, but we want to pre-select 2 as the default
    } else if (formatLower.includes('four') || formatLower.includes('4-man')) {
      return 4;
    } else {
      return 2; // Default for pairs formats (best ball, alternate shot, etc)
    }
  };

  // Helper to check if format is for pairs
  const isPairsFormat = (format: string) => {
    if (!format) return true;
    
    const formatLower = format.toLowerCase();
    return !formatLower.includes('singles') && 
           !formatLower.includes('four') && 
           !formatLower.includes('4-man');
  };

  // Helper to check if format is 4-man team
  const isFourManTeam = (format: string) => {
    if (!format) return false;
    
    const formatLower = format.toLowerCase();
    return formatLower.includes('four') || formatLower.includes('4-man');
  };

  // Helper to check if format is singles
  const isSinglesFormat = (format: string) => {
    if (!format) return false;
    
    const formatLower = format.toLowerCase();
    return formatLower.includes('singles');
  };

  // Initialize assignments when data loads
  useEffect(() => {
    if (scheduleData?.schedules) {
      console.log("Schedule data loaded:", scheduleData);
      const matchesWithAssignmentData: PlayerAssignment[] = [];
      
      scheduleData.schedules.forEach((day: any) => {
        console.log(`Processing day ${day.id} with ${day.matches?.length || 0} matches`);
        
        if (Array.isArray(day.matches)) {
          day.matches.forEach((match: any) => {
            // Only add matches that don't have a dayFilter set, or match the current filter
            if (dayFilter === 'all' || day.id === dayFilter) {
              console.log(`Adding match ${match.id}: ${match.homeTeam} vs ${match.awayTeam}`);
              
              matchesWithAssignmentData.push({
                matchId: match.id,
                homeTeam: match.homeTeam,
                homeTeamId: match.homeTeamId,
                awayTeam: match.awayTeam,
                awayTeamId: match.awayTeamId,
                format: match.format,
                formatId: match.formatId,
                courseId: match.courseId,
                startingHole: match.startingHole,
                teeTime: match.teeTime,
                scheduleId: match.scheduleId,
                homePlayers: [],
                awayPlayers: [],
                requiredPlayers: getRequiredPlayersByFormat(match.format),
                allHomePlayers: [],
                allAwayPlayers: [],
                expanded: false,
                isPairsFormat: isPairsFormat(match.format),
                isFourManTeam: isFourManTeam(match.format),
                isSingles: isSinglesFormat(match.format),
                time: new Date(match.teeTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'UTC',
                }),
                course: match.course,
                needsMatchups: isSinglesFormat(match.format),
                playerMatchups: []
              });
            }
          });
        } else {
          console.warn(`Day ${day.id} has no matches array`);
        }
      });
      
      console.log(`Created ${matchesWithAssignmentData.length} match assignments`);
      setAssignments(matchesWithAssignmentData);
      
      // Get current player assignments
      loadCurrentPlayerAssignments(matchesWithAssignmentData);
    } else {
      console.warn("No schedule data available");
    }
  }, [scheduleData, dayFilter]);

  // Load current player assignments for each match
  const loadCurrentPlayerAssignments = async (currentAssignments: PlayerAssignment[]) => {
    const updatedAssignments = [...currentAssignments];
    
    try {
      for (let i = 0; i < updatedAssignments.length; i++) {
        const match = updatedAssignments[i];
        const response = await fetch(`/api/matches/${match.matchId}/players`);
        
        if (response.ok) {
          const rawResponse = await response.json();
          
          // Handle the API response format - our API wrapper uses success: true, data: {...}
          // but direct fetch doesn't unwrap this
          const data = rawResponse.success === true ? rawResponse.data : rawResponse;
          
          console.log(`API direct response format for match ${match.matchId}:`, rawResponse);
          console.log(`API response for match ${match.matchId}:`, {
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            homePlayersCount: data.homePlayers?.length || 0,
            awayPlayersCount: data.awayPlayers?.length || 0,
            allHomePlayersCount: Array.isArray(data.allHomePlayers) ? data.allHomePlayers.length : 0,
            allAwayPlayersCount: Array.isArray(data.allAwayPlayers) ? data.allAwayPlayers.length : 0,
            // Add sample player data to verify structure
            homePlayerSample: Array.isArray(data.allHomePlayers) && data.allHomePlayers.length > 0 ? data.allHomePlayers[0] : null,
            awayPlayerSample: Array.isArray(data.allAwayPlayers) && data.allAwayPlayers.length > 0 ? data.allAwayPlayers[0] : null,
            // Debug the raw data
            dataKeys: Object.keys(data)
          });
          
          // First log the full data structure
          console.log(`Full API data for match ${match.matchId}:`, data);
          
          // Get available players (all players from both teams)
          try {
            // Extract the actual data from the API response
            // If response has success:true wrapper, use data.data structure
            const responseData = data.success === true ? data.data : data;
            
            // The API returns players with complete objects including IDs
            if (responseData && responseData.allHomePlayers && Array.isArray(responseData.allHomePlayers)) {
              match.allHomePlayers = [...responseData.allHomePlayers]; 
              console.log(`Found ${responseData.allHomePlayers.length} home players for match ${match.matchId}`);
              
              // Debug player info
              if (responseData.allHomePlayers.length > 0) {
                const samplePlayer = responseData.allHomePlayers[0];
                console.log(`Home player sample: ID=${samplePlayer.id}, Name=${samplePlayer.name}`);
              }
            } else {
              match.allHomePlayers = [];
              console.log(`No home players found in API response for match ${match.matchId}`);
            }
            
            // Same for away players
            if (responseData && responseData.allAwayPlayers && Array.isArray(responseData.allAwayPlayers)) {
              match.allAwayPlayers = [...responseData.allAwayPlayers];
              console.log(`Found ${responseData.allAwayPlayers.length} away players for match ${match.matchId}`);
              
              // Debug player info
              if (responseData.allAwayPlayers.length > 0) {
                const samplePlayer = responseData.allAwayPlayers[0];
                console.log(`Away player sample: ID=${samplePlayer.id}, Name=${samplePlayer.name}`);
              }
            } else {
              match.allAwayPlayers = [];
              console.log(`No away players found in API response for match ${match.matchId}`);
            }
            
            // Log player counts after assignment
            console.log(`After processing, match ${match.matchId} has ${match.allHomePlayers.length} home players and ${match.allAwayPlayers.length} away players`);
            
          } catch (err) {
            console.error(`Error processing player data for match ${match.matchId}:`, err);
            match.allHomePlayers = [];
            match.allAwayPlayers = [];
          }
          
          // Get currently assigned players, handling nested data structure
          let assignedHomePlayers: any[] = [];
          let assignedAwayPlayers: any[] = [];
          
          // Extract the actual data from the API response
          const responseData = data.success === true ? data.data : data;
          
          if (responseData && responseData.homePlayers) {
            assignedHomePlayers = responseData.homePlayers;
          }
          
          if (responseData && responseData.awayPlayers) {
            assignedAwayPlayers = responseData.awayPlayers;
          }
          
          // Ensure we have arrays we can work with
          if (!Array.isArray(assignedHomePlayers)) assignedHomePlayers = [];
          if (!Array.isArray(assignedAwayPlayers)) assignedAwayPlayers = [];
          
          console.log(`Assigned players (before mapping): ${assignedHomePlayers.length} home, ${assignedAwayPlayers.length} away`);
          
          // Only map the IDs if we have player objects with IDs
          if (assignedHomePlayers.length > 0 && typeof assignedHomePlayers[0] === 'object' && assignedHomePlayers[0].id) {
            match.homePlayers = assignedHomePlayers.map((p: any) => p.id);
          } else if (Array.isArray(assignedHomePlayers) && assignedHomePlayers.every((id: any) => typeof id === 'string')) {
            // If they're already IDs, use as is
            match.homePlayers = assignedHomePlayers;
          } else {
            match.homePlayers = [];
          }
          
          if (assignedAwayPlayers.length > 0 && typeof assignedAwayPlayers[0] === 'object' && assignedAwayPlayers[0].id) {
            match.awayPlayers = assignedAwayPlayers.map((p: any) => p.id);
          } else if (Array.isArray(assignedAwayPlayers) && assignedAwayPlayers.every((id: any) => typeof id === 'string')) {
            // If they're already IDs, use as is
            match.awayPlayers = assignedAwayPlayers;
          } else {
            match.awayPlayers = [];
          }
          
          console.log(`Assigned players (after mapping): ${match.homePlayers.length} home, ${match.awayPlayers.length} away`);
              
          // For singles format, also set up the player matchups
          // Use the responseData here too for consistency
          if (match.isSingles) {
            match.playerMatchups = [];
            
            if (responseData && Array.isArray(responseData.pairingGroups) && responseData.pairingGroups.length > 0) {
              console.log(`Found ${responseData.pairingGroups.length} pairing groups for match ${match.matchId}`);
              
              // Find the pairings
              for (const group of responseData.pairingGroups) {
                const homeGroup = responseData.homePlayersByGroup ? responseData.homePlayersByGroup[group] : null;
                const awayGroup = responseData.awayPlayersByGroup ? responseData.awayPlayersByGroup[group] : null;
                
                const homePlayersInGroup = Array.isArray(homeGroup) ? homeGroup : [];
                const awayPlayersInGroup = Array.isArray(awayGroup) ? awayGroup : [];
                
                if (homePlayersInGroup.length === 1 && awayPlayersInGroup.length === 1) {
                  match.playerMatchups.push({
                    homeId: homePlayersInGroup[0].id,
                    awayId: awayPlayersInGroup[0].id
                  });
                  
                  console.log(`Added matchup between ${homePlayersInGroup[0].name} and ${awayPlayersInGroup[0].name}`);
                }
              }
            } else {
              console.log(`No pairing groups found for singles match ${match.matchId}`);
            }
          }
        }
      }
      
      setAssignments(updatedAssignments);
    } catch (err) {
      console.error("Error loading player assignments:", err);
      setError("Failed to load current player assignments");
    }
  };

  // Toggle the expanded state of a match
  const toggleExpandMatch = (matchId: string) => {
    setAssignments(assignments.map(match => 
      match.matchId === matchId 
        ? { ...match, expanded: !match.expanded } 
        : match
    ));
  };

  // Handle player selection change
  const handlePlayerChange = (
    matchId: string, 
    isHomeTeam: boolean, 
    playerIds: string[]
  ) => {
    setAssignments(assignments.map(match => {
      if (match.matchId === matchId) {
        // Update either home or away players
        return {
          ...match,
          homePlayers: isHomeTeam ? playerIds : match.homePlayers,
          awayPlayers: !isHomeTeam ? playerIds : match.awayPlayers
        };
      }
      return match;
    }));
  };

  // Handle singles matchups change
  const handleSinglesMatchupChange = (
    matchId: string, 
    matchups: {homeId: string, awayId: string}[]
  ) => {
    setAssignments(assignments.map(match => {
      if (match.matchId === matchId) {
        return {
          ...match,
          playerMatchups: matchups
        };
      }
      return match;
    }));
  };

  // Create a foursome group
  const createFoursomeGroup = async (groups: any[]) => {
    if (!groups || groups.length === 0) {
      setError("No valid foursome groups provided");
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch('/api/matches/create-foursome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groups }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create foursome: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Refresh the data
      refreshSchedules();
      setShowFoursomeEditor(false);
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error('Error creating foursome:', err);
      setError(err.message || 'Failed to create foursome');
    } finally {
      setSaving(false);
    }
  };

  // Save player assignments
  const savePlayerAssignments = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const standardAssignmentsPayloads = [];
      const foursomeCreationPayloads = []; // Separate payload for singles/foursomes
      
      for (const match of assignments) {
        // Check if players have actually been assigned to avoid empty saves
        const hasHomeAssignment = match.homePlayers.length > 0;
        const hasAwayAssignment = match.awayPlayers.length > 0;
        const hasMatchups = match.isSingles && match.playerMatchups && match.playerMatchups.length === 2;
        
        if (match.isSingles && hasMatchups) {
          // Prepare payload for createFoursome API endpoint
          console.log(`Preparing payload for createFoursome for placeholder match: ${match.matchId}`);
          foursomeCreationPayloads.push({
            tournamentId: tournamentId, // Use tournamentId from hook props
            scheduleId: match.scheduleId,
            formatId: match.formatId,
            homeTeamId: match.homeTeamId,
            awayTeamId: match.awayTeamId,
            courseId: match.courseId,
            startingHole: match.startingHole,
            teeTime: match.teeTime, // Pass the original teeTime string/date
            matchups: match.playerMatchups.map(m => ({ 
              homePlayerId: m.homeId, 
              awayPlayerId: m.awayId 
            })),
            placeholderMatchId: match.matchId // Include placeholder ID for potential deletion
          });
        } else if (!match.isSingles && (hasHomeAssignment || hasAwayAssignment)) {
          // Prepare payload for standard batch-assign endpoint
          standardAssignmentsPayloads.push({
            matchId: match.matchId,
            homePlayers: match.homePlayers,
            awayPlayers: match.awayPlayers
          });
        }
      }
      
      let allSuccessful = true;
      let errorMessages: string[] = [];

      // 1. Process Foursome Creations
      if (foursomeCreationPayloads.length > 0) {
        console.log('Calling API to create foursomes...', foursomeCreationPayloads);
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            throw new Error('Authentication token not found. Please log in again.');
          }
          const response = await fetch('/api/matches/create-foursome', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify({ foursomes: foursomeCreationPayloads }), // Send as 'foursomes' array
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to create foursomes: ${response.statusText}`);
          }
          console.log('Foursome creation successful.');
          // Consider deleting placeholder matches here or in the API response
        } catch (err: any) {
          allSuccessful = false;
          errorMessages.push(err.message || 'Failed during foursome creation.');
          console.error('Error creating foursomes:', err);
        }
      }

      // 2. Process Standard Assignments (if any and no foursome errors)
      if (standardAssignmentsPayloads.length > 0 && allSuccessful) {
        console.log('Calling API for standard batch assignments...');
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            throw new Error('Authentication token not found. Please log in again.');
          }
          const response = await fetch('/api/matches/batch-assign', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify({ assignments: standardAssignmentsPayloads }),
          });
          if (!response.ok) {
             const errorData = await response.json();
             throw new Error(errorData.error || `Failed to save standard assignments: ${response.statusText}`);
          }
          console.log('Standard assignments successful.');
        } catch (err: any) {
           allSuccessful = false;
           errorMessages.push(err.message || 'Failed during standard assignments.');
           console.error('Error saving standard assignments:', err);
        }
      }
      
      if (foursomeCreationPayloads.length === 0 && standardAssignmentsPayloads.length === 0) {
         setError("No player assignments or foursome matchups to save");
         setSaving(false);
         return;
      }

      if (allSuccessful) {
        setSaveSuccess(true);
        // Refresh schedule data to show changes
        refreshSchedules(); 
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError(errorMessages.join(' \n '));
      }

    } catch (err: any) {
      console.error('Error saving assignments:', err);
      setError(err.message || 'Failed to save player assignments');
    } finally {
      setSaving(false);
    }
  };

  // Convert time string to proper ISO date string
  const timeStringToDate = (timeString: string) => {
    // Parse the timeString (format: "8:00 AM")
    const [time, period] = timeString.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    // Convert to 24-hour format
    let hour24 = hours;
    if (period === 'PM' && hours < 12) {
      hour24 += 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }
    
    // Create a new date with just the time component
    const date = new Date();
    date.setHours(hour24, minutes, 0, 0);
    
    return date.toISOString();
  };

  // Open foursome editor
  const handleOpenFoursomeEditor = (assignment: PlayerAssignment) => {
    setFoursomeData({
      formatId: assignment.formatId,
      homeTeamId: assignment.homeTeamId,
      awayTeamId: assignment.awayTeamId,
      courseId: assignment.courseId,
      startingHole: assignment.startingHole,
      teeTime: assignment.teeTime,
      scheduleId: assignment.scheduleId,
      allHomePlayers: assignment.allHomePlayers,
      allAwayPlayers: assignment.allAwayPlayers
    });
    setShowFoursomeEditor(true);
  };

  return {
    tournamentData,
    scheduleData,
    assignments,
    saving,
    saveSuccess,
    error,
    dayFilter,
    setDayFilter,
    showFoursomeEditor,
    setShowFoursomeEditor,
    foursomeData,
    toggleExpandMatch,
    handlePlayerChange,
    handleSinglesMatchupChange,
    createFoursomeGroup,
    savePlayerAssignments,
    handleOpenFoursomeEditor
  };
}