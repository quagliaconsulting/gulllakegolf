import { useState, useEffect } from 'react';
import { useApi, postApi } from '@/services/api/apiClient';

interface Hole {
  id: string;
  number: number;
  par: number;
  handicap: number;
  isPar3?: boolean;
  homeGross: number | null;
  awayGross: number | null;
  homeNet: number | null;
  awayNet: number | null;
  winner: 'home' | 'away' | 'tie' | null;
}

interface MatchData {
  match: {
    id: string;
    format: string;
    formatMultiplier: number;
    isFourManTeam: boolean;
    playerToPlayerMatch: boolean;
    foursomeGroupId: string | null;
    homeTeam: string;
    homeTeamId: string;
    homeTeamIsReal: boolean;
    awayTeam: string;
    awayTeamId: string;
    awayTeamIsReal: boolean;
    time: string;
    course: string;
    startingHole: number;
    holeCount: number;
    homePlayers: any[];
    awayPlayers: any[];
    holes: Hole[];
    homeTeamHandicap: number;
    awayTeamHandicap: number;
    points?: any;
    foursomeMatches?: any[];
  };
}

interface HoleScoreUpdate {
  holeNumber: number;
  homeGross: number | null;
  awayGross: number | null;
}

export function useScorecardState(matchId: string | undefined) {
  // Data fetching
  const {
    data,
    error,
    isLoading,
    mutate: refreshMatch,
  } = useApi<MatchData>(matchId ? `/matches/${matchId}/scores` : null);

  // State
  const [scores, setScores] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lockStatus, setLockStatus] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // Populate scores when data changes
  useEffect(() => {
    if (data?.match?.holes) {
      const initialScores: Record<string, any> = {};
      data.match.holes.forEach((hole: Hole) => {
        initialScores[`home-${hole.number}`] = hole.homeGross || '';
        initialScores[`away-${hole.number}`] = hole.awayGross || '';
      });
      setScores(initialScores);
    }
  }, [data?.match?.holes]);

  // Handle score input change
  const handleScoreChange = (key: string, value: string) => {
    // Don't update if card is locked
    if (lockStatus) return;

    // Only allow numbers or empty string
    if (value !== '' && !/^\d+$/.test(value)) {
      return;
    }

    setScores((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Save scores
  const saveScores = async () => {
    if (!matchId || !data?.match?.holes) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const holeUpdates: HoleScoreUpdate[] = data.match.holes.map((hole) => ({
        holeNumber: hole.number,
        homeGross: scores[`home-${hole.number}`] === '' ? null : Number(scores[`home-${hole.number}`]),
        awayGross: scores[`away-${hole.number}`] === '' ? null : Number(scores[`away-${hole.number}`])
      }));

      await postApi(`/matches/${matchId}/scores`, { holeResults: holeUpdates });
      await refreshMatch();
    } catch (error) {
      console.error('Error saving scores:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save scores');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle lock status
  const toggleLock = () => {
    if (!lockStatus) {
      // When locking, require password
      setShowPasswordModal(true);
    } else {
      // When unlocking, just unlock
      setLockStatus(false);
    }
  };

  // Verify password and lock scorecard
  const verifyPasswordAndLock = () => {
    const correctPassword = process.env.NEXT_PUBLIC_SCORECARD_PASSWORD || 'gull2023';
    
    if (passwordInput === correctPassword) {
      setLockStatus(true);
      setShowPasswordModal(false);
      setPasswordInput('');
    } else {
      alert('Incorrect password!');
    }
  };

  return {
    match: data?.match,
    scores,
    error,
    isLoading,
    isSaving,
    saveError,
    lockStatus,
    showPasswordModal,
    passwordInput,
    handleScoreChange,
    saveScores,
    toggleLock,
    setShowPasswordModal,
    setPasswordInput,
    verifyPasswordAndLock,
    refreshMatch,
  };
}