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
    tournamentId: string; // Added tournamentId field
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
  } = useApi<MatchData>(matchId ? `/api/matches/${matchId}/scores` : null);
  
  // Tournament info for CTP/Skins eligibility
  const { 
    data: tournamentData,
  } = useApi<any>(data?.match?.tournamentId ? `/api/tournaments/${data?.match?.tournamentId}` : null);
  
  // Get the tournament ID directly from the match data
  const getTournamentId = () => {
    if (!data?.match?.tournamentId) return null;
    return data.match.tournamentId;
  };

  // State
  const [scores, setScores] = useState<Record<string, any>>({});
  const [ctpWinners, setCtpWinners] = useState<Record<string, string | null>>({});
  const [potentialSkins, setPotentialSkins] = useState<Record<string, boolean>>({});
  const [skinsWinners, setSkinsWinners] = useState<Record<string, string | null>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lockStatus, setLockStatus] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  // Fetch skins results
  const [skinsResults, setSkinsResults] = useState<any[]>([]);

  // Populate scores when data changes
  useEffect(() => {
    if (data?.match?.holes) {
      const initialScores: Record<string, any> = {};
      
      // Initialize team scores
      data.match.holes.forEach((hole: Hole) => {
        initialScores[`home-${hole.number}`] = hole.homeGross || '';
        initialScores[`away-${hole.number}`] = hole.awayGross || '';
        
        // For singles/best ball formats, initialize player scores if available in hole data
        const isSinglesOrBestBall = data.match.format?.toLowerCase().includes('singles') || 
                                   data.match.format?.toLowerCase().includes('best ball');
        
        if (isSinglesOrBestBall) {
          // Check if player scores are stored in hole data
          if (data.match.homePlayers) {
            data.match.homePlayers.forEach((player: any) => {
              // Try to get player score from hole data if available
              const playerKey = `home-player-${player.id}-${hole.number}`;
              
              // Get player score from homePlayerScores if available
              const playerScore = hole.homePlayerScores && hole.homePlayerScores[player.id];
              
              if (playerScore !== undefined && playerScore !== null) {
                // Use player's stored score
                initialScores[playerKey] = playerScore.toString();
              } else if (data.match.format?.toLowerCase().includes('singles') && data.match.homePlayers.length === 1) {
                // For singles with one player, use team score as player score initially if no individual score
                initialScores[playerKey] = hole.homeGross || '';
              } else {
                // Otherwise initialize with empty score
                initialScores[playerKey] = '';
              }
            });
          }
          
          if (data.match.awayPlayers) {
            data.match.awayPlayers.forEach((player: any) => {
              const playerKey = `away-player-${player.id}-${hole.number}`;
              
              // Get player score from awayPlayerScores if available
              const playerScore = hole.awayPlayerScores && hole.awayPlayerScores[player.id];
              
              if (playerScore !== undefined && playerScore !== null) {
                // Use player's stored score
                initialScores[playerKey] = playerScore.toString();
              } else if (data.match.format?.toLowerCase().includes('singles') && data.match.awayPlayers.length === 1) {
                // For singles with one player, use team score as player score initially if no individual score
                initialScores[playerKey] = hole.awayGross || '';
              } else {
                // Otherwise initialize with empty score
                initialScores[playerKey] = '';
              }
            });
          }
        }
      });
      
      setScores(initialScores);
    }
  }, [data?.match?.holes]);

  // Load existing CTP winners and calculate potential skins
  useEffect(() => {
    if (data?.match?.id && tournamentData) {
      const tournamentId = getTournamentId();
      if (!tournamentId) return;
      
      // Load existing CTP winners if tournament has CTP
      if (tournamentData.hasCTP) {
        const fetchCtpWinners = async () => {
          try {
            const response = await fetch(`/api/tournaments/${tournamentId}/ctp?matchId=${data.match.id}`);
            if (response.ok) {
              const ctpData = await response.json();
              
              // Format CTP winners as holeId -> playerId mapping
              const ctpWinnerMap: Record<string, string | null> = {};
              if (Array.isArray(ctpData.ctpResults)) {
                ctpData.ctpResults.forEach((result: any) => {
                  ctpWinnerMap[result.holeId] = result.playerId;
                });
              }
              
              setCtpWinners(ctpWinnerMap);
            }
          } catch (error) {
            console.error('Error fetching CTP winners:', error);
          }
        };
        
        fetchCtpWinners();
      }
      
      // Load existing skins if tournament has skins
      if (tournamentData.hasSkins) {
        const fetchSkinsWinners = async () => {
          try {
            const response = await fetch(`/api/tournaments/${tournamentId}/skins?matchId=${data.match.id}`);
            if (response.ok) {
              const skinsData = await response.json();
              
              // Store full results
              if (Array.isArray(skinsData.skinsResults)) {
                setSkinsResults(skinsData.skinsResults);
                
                // Format skins winners as holeNumber -> playerId mapping
                const skinsWinnerMap: Record<string, string | null> = {};
                skinsData.skinsResults.forEach((result: any) => {
                  skinsWinnerMap[`${result.holeNumber}`] = result.playerId;
                });
                
                setSkinsWinners(skinsWinnerMap);
              }
            }
          } catch (error) {
            console.error('Error fetching skins winners:', error);
          }
        };
        
        fetchSkinsWinners();
      }
      
      // Fetch all matched scores to properly calculate skins
      if (tournamentData.hasSkins && data.match.holes) {
        // We need to compare scores across all matches to determine true skins
        const fetchAllMatchScores = async () => {
          try {
            // Get all matches for this tournament
            const response = await fetch(`/api/tournaments/${tournamentId}/matches`);
            if (response.ok) {
              const allMatches = await response.json();
              
              // Map of hole number -> lowest scores
              const lowestScoresByHole: Record<number, { gross: number, net: number }[]> = {};
              
              // First initialize with current match's scores
              data.match.holes.forEach((hole: Hole) => {
                lowestScoresByHole[hole.number] = [];
                
                // Add home team score if available
                if (hole.homeGross !== null && hole.homeNet !== null) {
                  lowestScoresByHole[hole.number].push({
                    gross: hole.homeGross,
                    net: hole.homeNet
                  });
                }
                
                // Add away team score if available
                if (hole.awayGross !== null && hole.awayNet !== null) {
                  lowestScoresByHole[hole.number].push({
                    gross: hole.awayGross,
                    net: hole.awayNet
                  });
                }
              });
              
              // Fetch scores for all other matches
              for (const match of allMatches.matches || []) {
                if (match.id === data.match.id) continue; // Skip current match
                
                // Fetch scores for this match
                const scoresResponse = await fetch(`/api/matches/${match.id}/scores`);
                if (scoresResponse.ok) {
                  const matchData = await scoresResponse.json();
                  
                  // Add scores to our mapping
                  if (matchData?.match?.holes) {
                    matchData.match.holes.forEach((hole: Hole) => {
                      if (!lowestScoresByHole[hole.number]) {
                        lowestScoresByHole[hole.number] = [];
                      }
                      
                      // Add home team score if available
                      if (hole.homeGross !== null && hole.homeNet !== null) {
                        lowestScoresByHole[hole.number].push({
                          gross: hole.homeGross,
                          net: hole.homeNet
                        });
                      }
                      
                      // Add away team score if available
                      if (hole.awayGross !== null && hole.awayNet !== null) {
                        lowestScoresByHole[hole.number].push({
                          gross: hole.awayGross,
                          net: hole.awayNet
                        });
                      }
                    });
                  }
                }
              }
              
              // Now determine potential skins by finding unique lowest scores
              const potentialSkinsMap: Record<string, boolean> = {};
              
              data.match.holes.forEach((hole: Hole) => {
                const holeScores = lowestScoresByHole[hole.number] || [];
                
                // Sort scores by net score (lower is better)
                holeScores.sort((a, b) => a.net - b.net);
                
                // If there's at least one score
                if (holeScores.length > 0) {
                  const lowestNetScore = holeScores[0].net;
                  
                  // Check if this is a unique lowest score (a skin)
                  const isUnique = holeScores.filter(score => score.net === lowestNetScore).length === 1;
                  
                  // Check if current match has the unique lowest score
                  if (isUnique) {
                    if (hole.homeNet === lowestNetScore) {
                      potentialSkinsMap[`home-${hole.number}`] = true;
                      
                      // Check if we already have a recorded skin for this hole
                      const existingSkin = skinsResults.find(skin => skin.holeNumber === hole.number);
                      if (existingSkin) {
                        console.log(`Confirmed skin on hole ${hole.number}`);
                      } else {
                        console.log(`Potential skin on hole ${hole.number} for home team`);
                      }
                    }
                    if (hole.awayNet === lowestNetScore) {
                      potentialSkinsMap[`away-${hole.number}`] = true;
                      
                      // Check if we already have a recorded skin for this hole
                      const existingSkin = skinsResults.find(skin => skin.holeNumber === hole.number);
                      if (existingSkin) {
                        console.log(`Confirmed skin on hole ${hole.number}`);
                      } else {
                        console.log(`Potential skin on hole ${hole.number} for away team`);
                      }
                    }
                  }
                }
              });
              
              setPotentialSkins(potentialSkinsMap);
            }
          } catch (error) {
            console.error('Error calculating skins across all matches:', error);
          }
        };
        
        fetchAllMatchScores();
      }
    }
  }, [data?.match, tournamentData]);

  // Handle score input change
  const handleScoreChange = (key: string, value: string) => {
    // Don't update if card is locked
    if (lockStatus) return;

    // Only allow numbers or empty string
    if (value !== '' && !/^\d+$/.test(value)) {
      return;
    }

    const newScores = {
      ...scores,
      [key]: value,
    };
    
    // Auto-calculate team scores for Best Ball format
    if (data?.match?.format?.toLowerCase().includes('best ball') && key.includes('player')) {
      const [team, _, playerId, holeNumber] = key.split('-');
      const playerKey = `${team}-player-${playerId}-${holeNumber}`;
      const teamKey = `${team}-${holeNumber}`;
      
      // Get all player scores for this hole and team
      const playerScores = Object.keys(newScores)
        .filter(k => k.startsWith(`${team}-player-`) && k.endsWith(`-${holeNumber}`))
        .map(k => newScores[k])
        .filter(score => score !== '' && !isNaN(Number(score)))
        .map(score => Number(score));
      
      // Find the best (lowest) score if any valid scores exist
      if (playerScores.length > 0) {
        const bestScore = Math.min(...playerScores);
        newScores[teamKey] = bestScore.toString();
      }
    }
    
    // For Singles, always copy the player's score to the team score
    if (data?.match?.format?.toLowerCase().includes('singles') && key.includes('player')) {
      const [team, _, playerId, holeNumber] = key.split('-');
      const teamKey = `${team}-${holeNumber}`;
      
      // For Singles with one player, simply use their score as the team score
      const teamPlayers = team === 'home' ? data.match.homePlayers : data.match.awayPlayers;
      if (teamPlayers.length === 1) {
        newScores[teamKey] = value;
      } else {
        // For Singles with multiple players (e.g., Head-to-Head matches grouped as foursome),
        // each player's score is used for their individual match
        // The player ID in the score key should match a player in the team
        const player = teamPlayers.find(p => p.id === playerId);
        if (player) {
          // This ensures each player's score is copied to their respective team score
          // in the context of their individual match
          newScores[teamKey] = value;
        }
      }
    }
    
    setScores(newScores);
  };

  // Save scores
  const saveScores = async () => {
    if (!matchId || !data?.match?.holes) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // Get format type to determine scoring method
      const isSinglesOrBestBall = data?.match?.format?.toLowerCase().includes('singles') || 
                                  data?.match?.format?.toLowerCase().includes('best ball');
      
      // For regular team matches, save as usual
      const holeUpdates: HoleScoreUpdate[] = data.match.holes.map((hole) => {
        // Standard team score info
        const update: HoleScoreUpdate = {
          holeNumber: hole.number,
          homeGross: scores[`home-${hole.number}`] === '' ? null : Number(scores[`home-${hole.number}`]),
          awayGross: scores[`away-${hole.number}`] === '' ? null : Number(scores[`away-${hole.number}`])
        };
        
        // For singles or best ball formats, collect player scores
        if (isSinglesOrBestBall) {
          // Prepare player scores for API if supported
          const homePlayerScores: Record<string, number | null> = {};
          const awayPlayerScores: Record<string, number | null> = {};
          
          if (data.match.homePlayers) {
            data.match.homePlayers.forEach((player: any) => {
              const scoreKey = `home-player-${player.id}-${hole.number}`;
              homePlayerScores[player.id] = scores[scoreKey] === '' ? null : Number(scores[scoreKey]);
            });
          }
          
          if (data.match.awayPlayers) {
            data.match.awayPlayers.forEach((player: any) => {
              const scoreKey = `away-player-${player.id}-${hole.number}`;
              awayPlayerScores[player.id] = scores[scoreKey] === '' ? null : Number(scores[scoreKey]);
            });
          }
          
          // Add player scores to update object - API now supports this in metadata
          update.homePlayerScores = homePlayerScores;
          update.awayPlayerScores = awayPlayerScores;
        }
        
        return update;
      });

      await postApi(`/api/matches/${matchId}/scores`, { holeResults: holeUpdates });
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
    // Get current time in HHMM format (24-hour)
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const currentTimePassword = `${hours}${minutes}`;
    
    const correctPassword = process.env.NEXT_PUBLIC_SCORECARD_PASSWORD || currentTimePassword;
    
    if (passwordInput === correctPassword) {
      setLockStatus(true);
      setShowPasswordModal(false);
      setPasswordInput('');
    } else {
      alert('Incorrect password! Try the current time in HHMM format (24-hour).');
    }
  };
  
  // State for CTP modal
  const [showCtpModal, setShowCtpModal] = useState(false);
  const [ctpModalData, setCtpModalData] = useState<{
    holeId: string;
    holeName: string;
    currentWinnerId: string | null;
  }>({
    holeId: '',
    holeName: '',
    currentWinnerId: null
  });
  
  // State for Skins modal
  const [showSkinsModal, setShowSkinsModal] = useState(false);
  const [skinsModalData, setSkinsModalData] = useState<{
    holeNumber: number;
    holeName: string;
    currentWinnerId: string | null;
    currentScore: number | null;
  }>({
    holeNumber: 0,
    holeName: '',
    currentWinnerId: null,
    currentScore: null
  });
  
  // Handle opening CTP modal
  const openCtpModal = (holeId: string, holeNumber: number) => {
    const hole = data?.match?.holes.find(h => h.id === holeId);
    if (!hole || !hole.isPar3) {
      alert('CTP can only be recorded on par 3 holes');
      return;
    }
    
    setCtpModalData({
      holeId,
      holeName: `Hole ${holeNumber}`,
      currentWinnerId: ctpWinners[holeId] || null
    });
    setShowCtpModal(true);
  };
  
  // Handle CTP winner selection
  const handleCtpWinnerChange = async (holeId: string, playerId: string | null) => {
    const tournamentId = getTournamentId();
    if (!tournamentId || !data?.match) return;
    
    try {
      // Update local state immediately for responsive UI
      setCtpWinners(prev => ({
        ...prev,
        [holeId]: playerId
      }));
      
      // Save to the server
      await postApi(`/api/tournaments/${tournamentId}/ctp`, {
        holeId,
        playerId,
        matchId: data.match.id,
        tournamentId
      });
    } catch (error) {
      console.error('Error saving CTP winner:', error);
      alert('Failed to save CTP winner. Please try again.');
    }
  };
  
  // Handle saving CTP with distance
  const handleSaveCtpWithDistance = async (holeId: string, playerId: string, distance: string) => {
    const tournamentId = getTournamentId();
    if (!tournamentId || !data?.match) return;
    
    try {
      // Update local state immediately for responsive UI
      setCtpWinners(prev => ({
        ...prev,
        [holeId]: playerId
      }));
      
      // Save to the server
      await postApi(`/api/tournaments/${tournamentId}/ctp`, {
        holeId,
        playerId,
        distance: distance || undefined,
        matchId: data.match.id,
        tournamentId
      });
      
      // Close modal
      setShowCtpModal(false);
    } catch (error) {
      console.error('Error saving CTP winner:', error);
      alert('Failed to save CTP winner. Please try again.');
    }
  };
  
  // Handle opening Skins modal
  const openSkinsModal = (hole: Hole) => {
    if (!data?.match) return;
    
    // Check if scores are entered
    if (hole.homeGross === null || hole.awayGross === null) {
      alert('Both teams must have scores entered before recording a skin');
      return;
    }
    
    // Determine potential skin
    const homePotentialSkin = potentialSkins[`home-${hole.number}`];
    const awayPotentialSkin = potentialSkins[`away-${hole.number}`];
    
    // Get current skin winner if it exists
    const currentWinnerId = skinsWinners[`${hole.number}`] || null;
    
    // Get score for the hole (use the lower of the two scores)
    const homeScore = hole.homeGross || Infinity;
    const awayScore = hole.awayGross || Infinity;
    
    // Determine the best score and which player achieved it
    const bestScore = Math.min(homeScore, awayScore);
    
    // Add potential winner indicator to players
    let potentialWinnerPlayerId = null;
    
    // For singles/best ball, we want to select the specific player with the best score
    if (data.match.format?.toLowerCase().includes('singles') || 
        data.match.format?.toLowerCase().includes('best ball')) {
      
      // Determine which team had the better score
      const bestScoreTeam = homeScore < awayScore ? 'home' : 
                         awayScore < homeScore ? 'away' : null;
      
      // If scores are tied, we won't have a skin
      if (bestScoreTeam) {
        const players = bestScoreTeam === 'home' ? 
          data.match.homePlayers.map((p: any) => ({...p, potentialSkinWinner: hole.number})) : 
          data.match.awayPlayers.map((p: any) => ({...p, potentialSkinWinner: hole.number}));
        
        // For singles, select the specific player
        if (data.match.format?.toLowerCase().includes('singles') && players.length === 1) {
          potentialWinnerPlayerId = players[0].id;
        }
      }
    }
    
    setSkinsModalData({
      holeNumber: hole.number,
      holeName: `Hole ${hole.number}`,
      currentWinnerId: currentWinnerId || potentialWinnerPlayerId,
      currentScore: bestScore === Infinity ? null : bestScore
    });
    
    // Create enhanced players array with potential winner flag for the modal
    const allPlayers = [
      ...data.match.homePlayers.map((p: any) => ({
        ...p, 
        potentialSkinWinner: homePotentialSkin && hole.homeGross === bestScore ? hole.number : null,
        isHomeTeam: true
      })),
      ...data.match.awayPlayers.map((p: any) => ({
        ...p,
        potentialSkinWinner: awayPotentialSkin && hole.awayGross === bestScore ? hole.number : null,
        isHomeTeam: false
      }))
    ];
    
    // Log the potential skin winner for debugging
    const potentialWinner = allPlayers.find(p => p.potentialSkinWinner === hole.number);
    if (potentialWinner) {
      console.log(`Potential skin winner on hole ${hole.number}: ${potentialWinner.name} with score ${bestScore}`);
    }
    
    // Pass enhanced player data to the modal
    data.match.enhancedPlayers = allPlayers;
    
    setShowSkinsModal(true);
  };
  
  // Handle saving Skin
  const handleSaveSkin = async (holeNumber: number, playerId: string, score: number) => {
    const tournamentId = getTournamentId();
    if (!tournamentId || !data?.match) return;
    
    try {
      // Update local state immediately for responsive UI
      setSkinsWinners(prev => ({
        ...prev,
        [`${holeNumber}`]: playerId
      }));
      
      // Save to the server
      await postApi(`/api/tournaments/${tournamentId}/skins`, {
        holeNumber,
        playerId,
        score,
        matchId: data.match.id,
        tournamentId
      });
      
      // Close modal
      setShowSkinsModal(false);
    } catch (error) {
      console.error('Error saving skin:', error);
      alert('Failed to save skin. Please try again.');
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
    ctpWinners,
    potentialSkins,
    skinsWinners,
    skinsResults,
    tournamentData,
    // CTP Modal
    showCtpModal,
    setShowCtpModal,
    ctpModalData,
    openCtpModal,
    // Skins Modal
    showSkinsModal,
    setShowSkinsModal,
    skinsModalData,
    openSkinsModal,
    // Handlers
    handleScoreChange,
    handleCtpWinnerChange,
    handleSaveCtpWithDistance,
    handleSaveSkin,
    saveScores,
    toggleLock,
    setShowPasswordModal,
    setPasswordInput,
    verifyPasswordAndLock,
    refreshMatch,
  };
}