import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/services/api/apiClient';

interface MatchPlayerData {
  [matchId: string]: {
    homePlayers: any[];
    awayPlayers: any[];
  };
}

export function useTournamentDetails(tournamentId: string | undefined) {
  const [activeTab, setActiveTab] = useState('overview');
  const [matchPlayerData, setMatchPlayerData] = useState<MatchPlayerData>({});
  const [isDeletingMatch, setIsDeletingMatch] = useState<string | null>(null);

  // Fetch tournament data
  const {
    data: rawTournament,
    error,
    isLoading,
    mutate: refreshTournament
  } = useApi(
    tournamentId ? `/api/tournaments/${tournamentId}?includeFull=true` : null,
    { 
      revalidateOnFocus: false,
      dedupingInterval: 30000
    }
  );
  
  // Normalize tournament data to handle inconsistent API responses
  // If we have an error but tournamentId exists, create a placeholder tournament object
  const tournament = rawTournament ? {
    ...rawTournament,
    // Ensure status is a string with a default value
    status: rawTournament.status || 'upcoming',
    // Ensure other required fields have defaults
    teams: rawTournament.teams || [],
    players: rawTournament.players || 0,
    name: rawTournament.name || 'Tournament',
    location: rawTournament.location || '',
    startDate: rawTournament.startDate || new Date().toISOString(),
    endDate: rawTournament.endDate || new Date().toISOString(),
    // Ensure formatMultipliers and schedules exist
    formatMultipliers: rawTournament.formatMultipliers || [],
    schedules: rawTournament.schedules || []
  } : error && tournamentId ? {
    // Fallback tournament object if there's an error but we have an ID
    id: tournamentId,
    name: "Tournament",
    status: "upcoming",
    teams: [],
    players: 0,
    location: "",
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    formatMultipliers: [],
    schedules: []
  } : null;

  // Fetch schedules from tournament schedule endpoint
  const {
    data: rawSchedulesData,
    error: schedulesError,
    isLoading: schedulesLoading,
    mutate: refreshSchedules
  } = useApi(
    tournamentId ? `/api/tournaments/${tournamentId}/schedule` : null,
    { 
      revalidateOnFocus: false
    }
  );
  
  // Normalize schedules data to handle both old and new API formats, and handle 404 errors
  const schedulesData = (rawSchedulesData || schedulesError) ? {
    schedules: rawSchedulesData?.schedules || rawSchedulesData?.schedule || []
  } : { schedules: [] };

  // Function to load match players data
  const loadMatchPlayers = useCallback(async () => {
    if (!schedulesData?.schedules) return;
    
    try {
      const schedules = schedulesData.schedules;
      let needsUpdate = false;
      const updatedMatchData = { ...matchPlayerData };

      for (const schedule of schedules) {
        if (schedule.matches) {
          for (const match of schedule.matches) {
            // Skip if we already have player data for this match
            if (updatedMatchData[match.id] && 
                updatedMatchData[match.id].homePlayers && 
                updatedMatchData[match.id].homePlayers.length > 0 &&
                updatedMatchData[match.id].awayPlayers && 
                updatedMatchData[match.id].awayPlayers.length > 0) {
              continue;
            }

            try {
              console.log(`Loading players for match ${match.id} (${match.format})`);
              const response = await fetch(`/api/matches/${match.id}/players`);
              if (response.ok) {
                const data = await response.json();
                
                // Handle different response formats
                let homePlayers = [];
                let awayPlayers = [];
                
                if (data.success && data.data) {
                  homePlayers = data.data.homePlayers || [];
                  awayPlayers = data.data.awayPlayers || [];
                } else {
                  homePlayers = data.homePlayers || [];
                  awayPlayers = data.awayPlayers || [];
                }
                
                // If we've got player data, update our state
                if (homePlayers.length > 0 || awayPlayers.length > 0) {
                  updatedMatchData[match.id] = {
                    homePlayers,
                    awayPlayers,
                    format: match.format
                  };
                  needsUpdate = true;
                } else if (data.allHomePlayers || data.allAwayPlayers) {
                  // Use available players if no assigned players
                  updatedMatchData[match.id] = {
                    homePlayers: data.allHomePlayers || [],
                    awayPlayers: data.allAwayPlayers || [],
                    format: match.format
                  };
                  needsUpdate = true;
                  console.log(`No assigned players found for match ${match.id}, using available players`);
                } else {
                  console.warn(`No player data found for match ${match.id} (${match.format}) - click this match to assign players`);
                }
              }
            } catch (err) {
              console.error(`Error loading players for match ${match.id}:`, err);
            }
          }
        }
      }

      if (needsUpdate) {
        setMatchPlayerData(updatedMatchData);
      }
    } catch (err) {
      console.error("Error loading match players:", err);
    }
  }, [schedulesData, matchPlayerData]);

  // Effect to load player data for matches when schedule tab is active
  useEffect(() => {
    if (activeTab === 'schedule' && schedulesData?.schedules) {
      loadMatchPlayers();
    }
  }, [activeTab, schedulesData, loadMatchPlayers]);

  // Reset match player data when tournament changes
  useEffect(() => {
    setMatchPlayerData({});
  }, [tournamentId]);

  return {
    tournament,
    error,
    isLoading,
    activeTab,
    setActiveTab,
    matchPlayerData,
    isDeletingMatch,
    setIsDeletingMatch,
    schedulesData,
    schedulesError,
    schedulesLoading,
    refreshTournament,
    refreshSchedules,
    loadMatchPlayers
  };
}