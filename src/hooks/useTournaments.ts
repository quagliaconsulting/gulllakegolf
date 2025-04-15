import useSWR from 'swr';
import api, { fetchData, postData, putData, deleteData } from '@/utils/api';

const fetcher = (url: string) => fetchData(url);

/**
 * Hook to fetch all tournaments
 */
export function useTournaments() {
  const { data, error, isLoading, mutate } = useSWR('/api/tournaments', fetcher);

  return {
    tournaments: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook to fetch a specific tournament by ID
 */
export function useTournament(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/tournaments/${id}` : null,
    fetcher
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
    const response = await postData('/api/tournaments', tournamentData);
    return response.tournament;
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
    const response = await putData(`/api/tournaments/${id}`, tournamentData);
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
    const response = await deleteData(`/api/tournaments/${id}`);
    return response;
  } catch (error) {
    console.error('Error deleting tournament:', error);
    throw error;
  }
}