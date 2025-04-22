import useSWR from 'swr';
import { useApi, postApi, putApi, deleteApi, fetcher } from '@/services/api/apiClient';

/**
 * Hook to fetch all tournaments
 */
export function useTournaments() {
  const { data, error, isLoading, mutate } = useApi('/api/tournaments');

  // Handle both old and new API response formats
  const tournaments = data && Array.isArray(data) ? data : 
                     (data && Array.isArray(data.data) ? data.data : []);

  return {
    tournaments: tournaments || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook to fetch a specific tournament by ID
 */
export function useTournament(id: string) {
  const { data, error, isLoading, mutate } = useApi(
    id ? `/api/tournaments/${id}` : null
  );

  return {
    tournament: data,
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Create a new tournament
 */
export async function createTournament(tournamentData: any) {
  try {
    console.log('Creating tournament with data:', tournamentData);
    // The postApi function now returns the 'data' property from the response
    const tournament = await postApi('/api/tournaments', tournamentData);
    console.log('API response tournament:', tournament);
    
    if (tournament) {
      return tournament;
    } else {
      console.error('Unexpected empty response');
      throw new Error('Empty response from server');
    }
  } catch (error) {
    console.error('Error creating tournament:', error);
    throw error;
  }
}

/**
 * Update an existing tournament
 */
export async function updateTournament(id: string, tournamentData: any) {
  try {
    const response = await putApi(`/api/tournaments/${id}`, tournamentData);
    return response.tournament;
  } catch (error) {
    console.error('Error updating tournament:', error);
    throw error;
  }
}

/**
 * Delete a tournament
 */
export async function deleteTournament(id: string) {
  try {
    const response = await deleteApi(`/api/tournaments/${id}`);
    return response;
  } catch (error) {
    console.error('Error deleting tournament:', error);
    throw error;
  }
}