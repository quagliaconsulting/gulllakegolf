import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import { 
  CalendarIcon, 
  UsersIcon, 
  TrophyIcon, 
  MapPinIcon,
  ArrowUpIcon, 
  ArrowDownIcon 
} from '@heroicons/react/24/outline';

// Types for our data
type Tournament = {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  teams?: { id: string; name: string }[] | string[];
};

type Match = {
  id: string;
  tournamentName: string;
  date: string;
  format: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
};

type StatItem = {
  name: string;
  stat: string;
  icon: React.ComponentType<any>;
  change: string;
  changeType: 'increase' | 'decrease' | 'unchanged';
};

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

// Helper function to safely check the change type
type ChangeType = 'increase' | 'decrease' | 'unchanged';

function isChangeType(value: any, type: ChangeType): boolean {
  return value === type;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState({
    tournaments: [] as Tournament[],
    matches: [] as Match[],
    stats: [
      { name: 'Total Tournaments', stat: '0', icon: TrophyIcon, change: '0%', changeType: 'unchanged' as ChangeType },
      { name: 'Active Players', stat: '0', icon: UsersIcon, change: '0%', changeType: 'unchanged' as ChangeType },
      { name: 'Upcoming Events', stat: '0', icon: CalendarIcon, change: '0%', changeType: 'unchanged' as ChangeType },
      { name: 'Courses', stat: '0', icon: MapPinIcon, change: '0%', changeType: 'unchanged' as ChangeType },
    ],
    financialSummary: {
      totalBuyIn: 0,
      totalCtpPool: 0,
      totalSkinsPool: 0,
      pendingPayments: 0,
      completedPayments: 0
    }
  });
  const [loading, setLoading] = useState(true);
  
  // Fetch data from the database
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch counts from database - handle potential errors for each request
        const tournamentsRes = await axios.get('/api/tournaments').catch(() => ({ data: [] }));
        const playersRes = await axios.get('/api/players').catch(() => ({ data: [] }));
        const coursesRes = await axios.get('/api/courses').catch(() => ({ data: [] }));
        const matchesRes = await axios.get('/api/matches').catch(() => ({ data: [] }));
        
        // Ensure we always have arrays, even if the response is undefined
        const tournaments = Array.isArray(tournamentsRes.data) ? tournamentsRes.data : [];
        const players = Array.isArray(playersRes.data) ? playersRes.data : [];
        const courses = Array.isArray(coursesRes.data) ? coursesRes.data : [];
        const matches = Array.isArray(matchesRes.data) ? matchesRes.data : [];
        
        // Calculate financial summary
        const financialSummary = {
          totalBuyIn: 0,
          totalCtpPool: 0,
          totalSkinsPool: 0,
          pendingPayments: 0,
          completedPayments: 0
        };
        
        // Calculate total players for money calculations
        let totalPlayerCount = 0;
        tournaments.forEach((t: any) => {
          // Get actual player count if available, otherwise estimate 12 per tournament
          const playerCount = t.players || 12;
          totalPlayerCount += playerCount;
          
          // Sum up financial totals
          if (t.buyIn) {
            financialSummary.totalBuyIn += t.buyIn * playerCount;
          }
          
          if (t.hasCTP && t.ctpPrizeAmount) {
            financialSummary.totalCtpPool += t.ctpPrizeAmount * playerCount;
          }
          
          if (t.hasSkins && t.skinsPrizeAmount) {
            financialSummary.totalSkinsPool += t.skinsPrizeAmount * playerCount;
          }
        });
        
        // Calculate percentage changes (mocked for now)
        const lastMonth = {
          tournaments: tournaments.length > 0 ? tournaments.length - 1 : 0,
          players: players.length > 0 ? Math.floor(players.length * 0.9) : 0,
          events: tournaments.filter((t: any) => 
            new Date(t.startDate) > new Date()
          ).length > 0 ? tournaments.filter((t: any) => 
            new Date(t.startDate) > new Date()
          ).length - 1 : 0,
          courses: courses.length > 0 ? courses.length : 0
        };
        
        // Update stats with real change data
        const updatedStats = [
          { 
            name: 'Total Tournaments', 
            stat: tournaments.length.toString(), 
            icon: TrophyIcon, 
            change: tournaments.length > lastMonth.tournaments ? 
              `+${Math.round((tournaments.length - lastMonth.tournaments) / Math.max(1, lastMonth.tournaments) * 100)}%` : 
              '0%',
            changeType: (tournaments.length > lastMonth.tournaments ? 'increase' : 'unchanged') as ChangeType
          },
          { 
            name: 'Active Players', 
            stat: players.length.toString(), 
            icon: UsersIcon, 
            change: players.length > lastMonth.players ? 
              `+${Math.round((players.length - lastMonth.players) / Math.max(1, lastMonth.players) * 100)}%` : 
              '0%',
            changeType: (players.length > lastMonth.players ? 'increase' : 'unchanged') as ChangeType
          },
          { 
            name: 'Upcoming Events', 
            stat: tournaments.filter((t: any) => 
              new Date(t.startDate) > new Date()
            ).length.toString(), 
            icon: CalendarIcon, 
            change: tournaments.filter((t: any) => 
              new Date(t.startDate) > new Date()
            ).length > lastMonth.events ?
              `+${Math.round((tournaments.filter((t: any) => 
                new Date(t.startDate) > new Date()
              ).length - lastMonth.events) / Math.max(1, lastMonth.events) * 100)}%` :
              '0%',
            changeType: (tournaments.filter((t: any) => 
              new Date(t.startDate) > new Date()
            ).length > lastMonth.events ? 'increase' : 'unchanged') as ChangeType
          },
          { 
            name: 'Courses', 
            stat: courses.length.toString(), 
            icon: MapPinIcon, 
            change: courses.length > lastMonth.courses ? 
              `+${Math.round((courses.length - lastMonth.courses) / Math.max(1, lastMonth.courses) * 100)}%` : 
              '0%',
            changeType: (courses.length > lastMonth.courses ? 'increase' : 'unchanged') as ChangeType
          },
        ];
        
        // Update dashboard data
        setDashboardData({
          tournaments: tournaments.slice(0, 5),
          matches: matches.slice(0, 3),
          stats: updatedStats,
          financialSummary: financialSummary
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardData();
  }, []);

  return (
    <>
      <Head>
        <title>Dashboard | Gull Lake Golf Tournament</title>
      </Head>

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold leading-6 text-gray-900">Dashboard</h1>
            <p className="mt-2 text-sm text-gray-700">
              Overview of your golf tournaments, upcoming events, and recent activity.
            </p>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <Link
              href="/tournaments/new"
              className="btn-primary"
            >
              New Tournament
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {['overview', 'tournaments', 'players', 'teams'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={classNames(
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                  'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium capitalize'
                )}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Stats */}
        <div className="mt-8">
          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {dashboardData.stats.map((item) => (
              <div key={item.name} className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                <dt className="truncate text-sm font-medium text-gray-500">
                  <div className="flex items-center">
                    <item.icon className="h-5 w-5 text-gray-400 mr-2" />
                    {item.name}
                  </div>
                </dt>
                <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
                  <div className="flex items-baseline text-2xl font-semibold text-gray-900">
                    {item.stat}
                  </div>
                  {item.change !== '0%' ? (
                    <div
                      className={classNames(
                        isChangeType(item.changeType, 'increase')
                          ? 'bg-green-100 text-green-800' 
                          : isChangeType(item.changeType, 'decrease')
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800',
                        'inline-flex items-baseline rounded-full px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0'
                      )}
                    >
                      {isChangeType(item.changeType, 'increase') ? (
                        <ArrowUpIcon 
                          className="-ml-1 mr-0.5 h-4 w-4 flex-shrink-0 self-center text-green-500"
                          aria-hidden="true"
                        />
                      ) : isChangeType(item.changeType, 'decrease') ? (
                        <ArrowDownIcon
                          className="-ml-1 mr-0.5 h-4 w-4 flex-shrink-0 self-center text-red-500"
                          aria-hidden="true"
                        />
                      ) : (
                        <span className="-ml-1 mr-0.5 h-4 w-4 flex-shrink-0 self-center">
                          —
                        </span>
                      )}
                      <span className="sr-only">
                        {isChangeType(item.changeType, 'increase') 
                          ? 'Increased' 
                          : isChangeType(item.changeType, 'decrease') 
                            ? 'Decreased' 
                            : 'Unchanged'} by
                      </span>
                      {item.change}
                    </div>
                  ) : (
                    <div className="inline-flex items-baseline rounded-full px-2.5 py-0.5 text-sm font-medium bg-gray-100 text-gray-800 md:mt-2 lg:mt-0">
                      Unchanged
                    </div>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Financial Summary */}
        <div className="mt-8 overflow-hidden rounded-lg bg-white shadow">
          <div className="p-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900">Financial Summary</h3>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
              <div className="overflow-hidden rounded-lg bg-green-50 px-4 py-3">
                <dt className="truncate text-sm font-medium text-green-700">Total Buy-Ins</dt>
                <dd className="mt-1 text-2xl font-semibold text-green-900">${dashboardData.financialSummary.totalBuyIn.toLocaleString()}</dd>
              </div>
              <div className="overflow-hidden rounded-lg bg-blue-50 px-4 py-3">
                <dt className="truncate text-sm font-medium text-blue-700">CTP Prize Pool</dt>
                <dd className="mt-1 text-2xl font-semibold text-blue-900">${dashboardData.financialSummary.totalCtpPool.toLocaleString()}</dd>
              </div>
              <div className="overflow-hidden rounded-lg bg-amber-50 px-4 py-3">
                <dt className="truncate text-sm font-medium text-amber-700">Skins Pool</dt>
                <dd className="mt-1 text-2xl font-semibold text-amber-900">${dashboardData.financialSummary.totalSkinsPool.toLocaleString()}</dd>
              </div>
              <div className="overflow-hidden rounded-lg bg-indigo-50 px-4 py-3">
                <dt className="truncate text-sm font-medium text-indigo-700">Pending Payments</dt>
                <dd className="mt-1 text-2xl font-semibold text-indigo-900">${dashboardData.financialSummary.pendingPayments}</dd>
              </div>
              <div className="overflow-hidden rounded-lg bg-purple-50 px-4 py-3">
                <dt className="truncate text-sm font-medium text-purple-700">Total Prize Money</dt>
                <dd className="mt-1 text-2xl font-semibold text-purple-900">
                  ${(dashboardData.financialSummary.totalBuyIn + 
                     dashboardData.financialSummary.totalCtpPool + 
                     dashboardData.financialSummary.totalSkinsPool).toLocaleString()}
                </dd>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Upcoming Tournaments */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-6">
              <h3 className="text-base font-semibold leading-6 text-gray-900">Upcoming Tournaments</h3>
              <div className="mt-6 flow-root">
                <ul className="-my-5 divide-y divide-gray-200">
                  {loading ? (
                    <li className="py-5 text-center text-gray-500">
                      Loading tournaments...
                    </li>
                  ) : dashboardData.tournaments.length > 0 ? (
                    dashboardData.tournaments.map((tournament) => (
                      <li key={tournament.id} className="py-5">
                        <div className="relative focus-within:ring-2 focus-within:ring-primary">
                          <h4 className="text-sm font-semibold text-gray-900">
                            <Link href={`/tournaments/${tournament.id}`} className="hover:underline focus:outline-none">
                              {tournament.name}
                            </Link>
                          </h4>
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                            {tournament.location} • {new Date(tournament.startDate).toLocaleDateString()} to {new Date(tournament.endDate).toLocaleDateString()}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Teams: {Array.isArray(tournament.teams) ? 
                              tournament.teams.map(team => typeof team === 'string' ? team : team.name).join(', ') : 
                              ''}
                          </p>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="py-5 text-center text-gray-500">
                      No tournaments found
                    </li>
                  )}
                </ul>
              </div>
              <div className="mt-6">
                <Link
                  href="/tournaments"
                  className="flex w-full items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-offset-0"
                >
                  View all
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Match Results */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-6">
              <h3 className="text-base font-semibold leading-6 text-gray-900">Recent Match Results</h3>
              <div className="mt-6 flow-root">
                <ul className="-my-5 divide-y divide-gray-200">
                  {loading ? (
                    <li className="py-5 text-center text-gray-500">
                      Loading match results...
                    </li>
                  ) : dashboardData.matches.length > 0 ? (
                    dashboardData.matches.map((match) => (
                      <li key={match.id} className="py-5">
                        <div className="relative focus-within:ring-2 focus-within:ring-primary">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {match.tournamentName} - {match.format}
                          </h4>
                          <p className="mt-1 text-sm text-gray-500">
                            {new Date(match.date).toLocaleDateString()}
                          </p>
                          <div className="mt-2 flex justify-between">
                            <span className="text-sm font-medium">{match.homeTeam}</span>
                            <span className="text-sm font-bold">{match.homeScore} - {match.awayScore}</span>
                            <span className="text-sm font-medium">{match.awayTeam}</span>
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="py-5 text-center text-gray-500">
                      No match results found
                    </li>
                  )}
                </ul>
              </div>
              <div className="mt-6">
                <Link
                  href="/tournaments/history"
                  className="flex w-full items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-offset-0"
                >
                  View all
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}