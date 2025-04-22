import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useTournamentDetails } from '../hooks/useTournamentDetails';
import TabNavigation from './TabNavigation';
import TournamentHeader from './TournamentHeader';
import OverviewTab from './OverviewTab';
import ScheduleTab from './ScheduleTab';
import ScorecardsTab from './ScorecardsTab';
import LeaderboardTab from './LeaderboardTab';
import TeamsTab from './TeamsTab';
import SettingsTab from './SettingsTab';
import MoneyTab from './MoneyTab';

export const TournamentDetails: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  
  const {
    tournament,
    error,
    isLoading,
    activeTab,
    setActiveTab,
    schedulesData,
    schedulesError,
    schedulesLoading,
    refreshTournament,
    refreshSchedules,
    matchPlayerData,
    isDeletingMatch,
    setIsDeletingMatch
  } = useTournamentDetails(id as string);

  // Loading state
  if (isLoading) {
    return <div className="p-8 text-center">Loading tournament details...</div>;
  }
  
  // Error state
  if (error) {
    return <div className="p-8 text-center text-red-600">Error loading tournament. Please try again.</div>;
  }
  
  // Not found state
  if (!tournament) {
    return <div className="p-8 text-center">Tournament not found</div>;
  }

  return (
    <>
      <Head>
        <title>{`${tournament.name} | Gull Lake Golf Tournament`}</title>
      </Head>

      <div>
        {/* Tournament Header */}
        <TournamentHeader 
          tournament={tournament} 
          id={id as string} 
          setActiveTab={setActiveTab} 
        />
        
        {/* Tab Navigation */}
        <TabNavigation 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
        />
        
        {/* Tab Content */}
        <div className="mt-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <OverviewTab tournament={tournament} schedulesData={schedulesData} />
          )}
          
          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <ScheduleTab
              tournamentId={id as string}
              schedulesData={schedulesData}
              schedulesLoading={schedulesLoading}
              schedulesError={schedulesError}
              refreshSchedules={refreshSchedules}
              matchPlayerData={matchPlayerData}
              isDeletingMatch={isDeletingMatch}
              setIsDeletingMatch={setIsDeletingMatch}
            />
          )}
          
          {/* Scorecards Tab */}
          {activeTab === 'scorecards' && (
            <ScorecardsTab
              tournamentId={id as string}
              schedulesData={schedulesData}
              schedulesLoading={schedulesLoading}
              schedulesError={schedulesError}
              refreshSchedules={refreshSchedules}
            />
          )}
          
          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <LeaderboardTab
              tournament={tournament}
              tournamentId={id as string}
            />
          )}
          
          {/* Teams & Players Tab */}
          {activeTab === 'teams' && (
            <TeamsTab 
              tournament={tournament} 
              tournamentId={id as string} 
            />
          )}
          
          {/* Money Tab */}
          {activeTab === 'money' && (
            <MoneyTab tournament={tournament} onRefresh={refreshTournament} />
          )}
          
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <SettingsTab
              tournament={tournament}
              tournamentId={id as string}
              refreshTournament={refreshTournament}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default TournamentDetails;