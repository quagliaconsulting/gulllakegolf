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
    tournamentId ? `/tournaments/${tournamentId}` : null,
    { 
      revalidateOnFocus: false,
      dedupingInterval: 30000
    }
  );
  
  // Normalize tournament data to handle inconsistent API responses
  const tournament = rawTournament ? {
    ...rawTournament,
    // Ensure status is a string with a default value
    status: rawTournament.status || 'upcoming',
    // Ensure other required fields have defaults
    teams: rawTournament.teams || [],
    name: rawTournament.name || 'Tournament',
    location: rawTournament.location || '',
    startDate: rawTournament.startDate || new Date().toISOString(),
    endDate: rawTournament.endDate || new Date().toISOString()
  } : null;

  // Fetch schedules
  const {
    data: schedulesData,
    error: schedulesError,
    isLoading: schedulesLoading,
    mutate: refreshSchedules
  } = useApi(
    tournamentId ? `/tournaments/${tournamentId}/schedule` : null,
    { 
      revalidateOnFocus: false
    }
  );

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
            if (updatedMatchData[match.id]) continue;

            try {
              const response = await fetch(`/api/matches/${match.id}/players`);
              if (response.ok) {
                const data = await response.json();
                if (data.homePlayers || data.awayPlayers) {
                  updatedMatchData[match.id] = {
                    homePlayers: data.homePlayers || [],
                    awayPlayers: data.awayPlayers || []
                  };
                  needsUpdate = true;
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