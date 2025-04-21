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
    tournamentId ? `/api/schedules?tournamentId=${tournamentId}` : null,
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
      const matchesWithAssignmentData: PlayerAssignment[] = [];
      
      scheduleData.schedules.forEach((day: any) => {
        day.matches.forEach((match: any) => {
          // Only add matches that don't have a dayFilter set, or match the current filter
          if (dayFilter === 'all' || day.id === dayFilter) {
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
      });
      
      setAssignments(matchesWithAssignmentData);
      
      // Get current player assignments
      loadCurrentPlayerAssignments(matchesWithAssignmentData);
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
          const data = await response.json();
          
          if (data.homePlayers && data.awayPlayers) {
            match.allHomePlayers = data.homePlayers;
            match.allAwayPlayers = data.awayPlayers;
            
            // Set already assigned players
            match.homePlayers = data.homePlayers
              .filter((p: any) => p.isAssigned)
              .map((p: any) => p.id);
              
            match.awayPlayers = data.awayPlayers
              .filter((p: any) => p.isAssigned)
              .map((p: any) => p.id);
              
            // For singles format, also set up the player matchups
            if (match.isSingles && data.pairingGroups) {
              match.playerMatchups = [];
              
              // Find the pairings
              for (const group of data.pairingGroups) {
                const homePlayersInGroup = data.homePlayersByGroup?.[group] || [];
                const awayPlayersInGroup = data.awayPlayersByGroup?.[group] || [];
                
                if (homePlayersInGroup.length === 1 && awayPlayersInGroup.length === 1) {
                  match.playerMatchups.push({
                    homeId: homePlayersInGroup[0].id,
                    awayId: awayPlayersInGroup[0].id
                  });
                }
              }
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
      
      const assignmentPayloads = [];
      
      for (const match of assignments) {
        if (match.homePlayers.length > 0 || match.awayPlayers.length > 0) {
          let payload: any = {
            matchId: match.matchId,
            homePlayers: match.homePlayers,
            awayPlayers: match.awayPlayers
          };
          
          // For singles format, include pairings
          if (match.isSingles && match.playerMatchups?.length) {
            payload.playerPairings = match.playerMatchups;
          }
          
          assignmentPayloads.push(payload);
        }
      }
      
      if (assignmentPayloads.length === 0) {
        setError("No player assignments to save");
        setSaving(false);
        return;
      }
      
      const response = await fetch('/api/matches/batch-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignments: assignmentPayloads }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save assignments: ${response.statusText}`);
      }
      
      // Success
      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
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