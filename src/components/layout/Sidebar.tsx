import { Fragment, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Dialog, Transition } from '@headlessui/react';
import { useAuth } from '@/lib/authContext';
import axios from 'axios';
import useSWR from 'swr';
import {
  CalendarIcon,
  HomeIcon,
  UsersIcon,
  XMarkIcon,
  TrophyIcon,
  MapPinIcon,
  PhotoIcon,
  ChartBarIcon,
  UserIcon,
  Cog6ToothIcon,
  Bars3Icon,
  PlusIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { 
    name: 'Tournaments', 
    href: '/tournaments', 
    icon: TrophyIcon,
    enhanced: true,  // Flag for enhanced styling
    badge: 'Active', // Show a badge if there's an active tournament
  },
  { name: 'Players', href: '/players', icon: UsersIcon },
  { 
    name: 'Teams', 
    href: '/teams', 
    icon: UsersIcon,
    // Teams navigation doesn't need the enhanced flag - that's just for Tournaments
  },
  { name: 'Courses', href: '/courses', icon: MapPinIcon },
  { name: 'Formats', href: '/formats', icon: ClipboardDocumentCheckIcon },
  { name: 'Schedule', href: '/schedule', icon: CalendarIcon },
  { name: 'Gallery', href: '/gallery', icon: PhotoIcon },
  { name: 'Reports', href: '/reports', icon: ChartBarIcon },
];

const userNavigation = [
  { name: 'Your Profile', href: '/profile', icon: UserIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

// Fetch function for SWR
const fetcher = (url: string) => axios.get(url).then(res => res.data);

// Simple countdown component for sidebar
function TournamentCountdownMini({ targetDate, status }: { targetDate: string, status: string }) {
  const [countdown, setCountdown] = useState<string>('');

  useEffect(() => {
    // Calculate and format countdown
    const calculateCountdown = () => {
      const now = new Date();
      // Create date with noon UTC time (to avoid timezone issues)
      const target = new Date(targetDate);
      target.setUTCHours(12, 0, 0, 0);
      
      // Calculate time difference
      const diff = target.getTime() - now.getTime();
      
      if (diff <= 0 && status === 'upcoming') {
        setCountdown('Today!');
        return;
      } else if (diff <= 0 && status === 'active') {
        setCountdown('Ends today!');
        return;
      } else if (diff <= 0) {
        setCountdown('Completed');
        return;
      }
      
      // Calculate days
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (days > 0) {
        setCountdown(status === 'upcoming' ? `Starts in ${days}d` : `Ends in ${days}d`);
      } else {
        // Calculate hours
        const hours = Math.floor(diff / (1000 * 60 * 60));
        setCountdown(status === 'upcoming' ? `Starts in ${hours}h` : `Ends in ${hours}h`);
      }
    };
    
    calculateCountdown();
    const interval = setInterval(calculateCountdown, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [targetDate, status]);
  
  return (
    <div className={`flex items-center text-xs font-medium rounded-full px-2 py-0.5 ${
      status === 'upcoming' ? 'bg-green-100 text-green-800' : 
      status === 'active' ? 'bg-green-100 text-green-800' : 
      'bg-gray-100 text-gray-800'
    }`}>
      <ClockIcon className="h-3 w-3 mr-1" />
      {countdown}
    </div>
  );
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  
  // Fetch active tournament with teams
  const { data: activeTournamentResponse } = useSWR(
    '/api/tournaments?status=active&limit=1&include=teams',
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 300000 } // 5 min refresh
  );
  
  // Fetch upcoming tournament with teams
  const { data: upcomingTournamentResponse } = useSWR(
    '/api/tournaments?status=upcoming&limit=1&include=teams',
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 300000 } // 5 min refresh
  );
  
  // Extract tournament data from response, handling multiple response formats
  const getDataFromResponse = (response: any) => {
    if (!response) return null;
    
    // Handle different response formats
    if (response.success && response.data) {
      // New format
      return Array.isArray(response.data) ? response.data : [response.data];
    } else if (Array.isArray(response)) {
      // Old format (direct array)
      return response;
    }
    
    return null;
  };
  
  const activeTournament = getDataFromResponse(activeTournamentResponse);
  const upcomingTournament = getDataFromResponse(upcomingTournamentResponse);
  
  // Get the tournament to display in sidebar
  const featuredTournament = activeTournament?.length > 0 ? 
    { data: activeTournament[0], status: 'active' } : 
    (upcomingTournament?.length > 0 ? 
      { data: upcomingTournament[0], status: 'upcoming' } : 
      null);
      
  // Log tournament data for debugging
  useEffect(() => {
    if (featuredTournament) {
      console.log('Featured Tournament Data:', featuredTournament.data);
      console.log('Teams Data:', featuredTournament.data.teams);
    }
  }, [featuredTournament]);
  
  // Fallback for when auth is loading or user is not logged in
  const userInfo = loading || !user ? {
    name: "Guest User",
    email: "",
    role: ""
  } : user;

  return (
    <>
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-16 flex-shrink-0 bg-white shadow-sm md:hidden">
        <div className="flex flex-1 justify-between px-2">
          <div className="flex flex-1 items-center">
            <button
              type="button"
              className="p-2 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="flex flex-shrink-0 items-center ml-1">
              <Link href="/" passHref legacyBehavior={false}>
                <div>
                  <span className="block font-bold text-primary text-lg leading-tight">GULL LAKE</span>
                  <div className="flex space-x-1 text-xs">
                    {featuredTournament?.data?.teams && Array.isArray(featuredTournament.data.teams) && featuredTournament.data.teams.length >= 2 ? (
                      <>
                        <span className="text-green-700 font-medium">
                          {typeof featuredTournament.data.teams[0] === 'object' ? featuredTournament.data.teams[0].name : featuredTournament.data.teams[0]}
                        </span>
                        <span className="text-gray-500">vs</span>
                        <span className="text-red-700 font-medium">
                          {typeof featuredTournament.data.teams[1] === 'object' ? featuredTournament.data.teams[1].name : featuredTournament.data.teams[1]}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-500">Golf Tournament</span>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          </div>
          
          {/* Mobile action buttons */}
          <div className="flex items-center space-x-2">
            {featuredTournament && (
              <Link
                href={`/tournaments/${featuredTournament.data.id}`}
                className="inline-flex items-center rounded-md bg-primary/10 p-1.5 text-xs font-medium text-primary"
              >
                <TrophyIcon className="h-3.5 w-3.5 mr-1" />
                Active
              </Link>
            )}
            <Link 
              href="/tournaments/new"
              passHref
              legacyBehavior={false}
              className="inline-flex items-center justify-center rounded-full bg-primary p-1.5 text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">New Tournament</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 md:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 z-40 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex w-full max-w-xs flex-1 flex-col bg-white pb-4 pt-5">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute right-0 top-0 -mr-12 pt-2">
                    <button
                      type="button"
                      className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                
                {/* Mobile sidebar header */}
                <div className="flex flex-shrink-0 items-center px-4">
                  <Link href="/" onClick={() => setSidebarOpen(false)} passHref legacyBehavior={false}>
                    <div>
                      <span className="block h-8 w-auto font-bold text-primary text-xl">GULL LAKE</span>
                      <span className="block text-xs">
                        {featuredTournament?.data?.teams && Array.isArray(featuredTournament.data.teams) && featuredTournament.data.teams.length >= 2 ? (
                          <>
                            <span className="text-green-700 font-medium">
                              {typeof featuredTournament.data.teams[0] === 'object' ? featuredTournament.data.teams[0].name : featuredTournament.data.teams[0]}
                            </span> <span className="text-gray-500">vs.</span> <span className="text-red-700 font-medium">
                              {typeof featuredTournament.data.teams[1] === 'object' ? featuredTournament.data.teams[1].name : featuredTournament.data.teams[1]}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-500">Golf Tournament</span>
                        )}
                      </span>
                    </div>
                  </Link>
                </div>
                
                {/* Mobile sidebar navigation */}
                <div className="mt-5 h-0 flex-1 overflow-y-auto">
                  <div className="px-2 pb-2">
                    <div className="flex items-center">
                      <img
                        className="h-9 w-9 rounded-full"
                        src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                        alt=""
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-700">{userInfo.name}</p>
                        <div className="flex items-center text-xs text-gray-500">
                          {userInfo.role === 'ADMIN' && (
                            <span className="px-1.5 py-0.5 mr-1 text-xs font-medium rounded-full bg-primary/10 text-primary">Admin</span>
                          )}
                          {userInfo.email}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Link
                        href="/tournaments/new"
                        passHref
                        legacyBehavior={false}
                        className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
                        onClick={() => setSidebarOpen(false)}
                      >
                        <PlusIcon className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
                        New Tournament
                      </Link>
                    </div>
                  </div>
                  
                  {/* Main navigation */}
                  <nav className="mt-4 space-y-1 px-2">
                    {navigation.map((item) => {
                      const isActive = router.pathname.startsWith(item.href);
                      
                      // Enhanced tournament item with countdown for mobile
                      if (item.enhanced && featuredTournament) {
                        return (
                          <div key={item.name} className="space-y-1">
                            <Link
                              href={item.href}
                              onClick={() => setSidebarOpen(false)}
                              passHref
                              legacyBehavior={false}
                              className={`group flex items-center rounded-md px-2 py-2 text-base font-medium ${isActive
                                ? 'bg-primary text-white'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                              <item.icon
                                className={`mr-4 h-6 w-6 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'}`}
                                aria-hidden="true"
                              />
                              {item.name}
                            </Link>
                            
                            {/* Tournament Quick Access Card - Mobile */}
                            <Link
                              href={`/tournaments/${featuredTournament.data.id}`}
                              onClick={() => setSidebarOpen(false)}
                              className="ml-10 mb-1 block rounded-md border border-gray-200 hover:border-primary hover:shadow-sm bg-white p-2 transition-all"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-xs truncate max-w-[160px]">
                                  {featuredTournament.data.name}
                                </span>
                                <TournamentCountdownMini 
                                  targetDate={featuredTournament.status === 'upcoming' ? featuredTournament.data.startDate : featuredTournament.data.endDate} 
                                  status={featuredTournament.status} 
                                />
                              </div>
                              
                              {/* Prize pool */}
                              {featuredTournament.data.totalPrize && (
                                <div className="mb-1 text-xs text-gray-700 flex items-center">
                                  <TrophyIcon className="h-3 w-3 mr-1 text-yellow-500" />
                                  Prize Pool: ${featuredTournament.data.totalPrize.toLocaleString()}
                                </div>
                              )}
                              
                              <div className="flex space-x-1">
                                {/* Team chips */}
                                {featuredTournament.data.teams && Array.isArray(featuredTournament.data.teams) ? 
                                  // Map through the team names (API returns array of strings)
                                  featuredTournament.data.teams.slice(0, 2).map((team: any) => {
                                    // Handle both object and string formats
                                    const teamName = typeof team === 'object' ? team.name : team;
                                    return (
                                      <span 
                                        key={teamName}
                                        className={`text-xs rounded-full px-2 py-0.5 ${
                                          teamName === 'Spartan Dawgs' ? 
                                          'bg-green-100 text-green-700' : 
                                          'bg-red-100 text-red-700'
                                        }`}
                                      >
                                        {teamName}
                                      </span>
                                    );
                                  })
                                  : 
                                  // Fallback when teams array is empty or not available
                                  <>
                                    <span className="text-xs rounded-full px-2 py-0.5 bg-green-100 text-green-700">
                                      Spartan Dawgs
                                    </span>
                                    <span className="text-xs rounded-full px-2 py-0.5 bg-red-100 text-red-700">
                                      Invited Guests
                                    </span>
                                  </>
                                }
                              </div>
                            </Link>
                          </div>
                        );
                      }
                      
                      // Regular navigation items
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          passHref
                          legacyBehavior={false}
                          className={`group flex items-center rounded-md px-2 py-2 text-base font-medium ${isActive
                            ? 'bg-primary text-white'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                          <item.icon
                            className={`mr-4 h-6 w-6 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'}`}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      );
                    })}
                  </nav>
                  
                  {/* User navigation */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="px-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Account</h3>
                    </div>
                    <nav className="mt-2 space-y-1 px-2">
                      {userNavigation.map((item) => {
                        const isActive = router.pathname === item.href;
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            passHref
                            legacyBehavior={false}
                            className={`group flex items-center rounded-md px-2 py-2 text-base font-medium ${isActive
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                          >
                            <item.icon
                              className="mr-4 h-6 w-6 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
                              aria-hidden="true"
                            />
                            {item.name}
                          </Link>
                        );
                      })}
                      <button
                        onClick={logout}
                        className="group flex w-full items-center rounded-md px-2 py-2 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      >
                        <XMarkIcon
                          className="mr-4 h-6 w-6 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
                          aria-hidden="true"
                        />
                        Sign out
                      </button>
                    </nav>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
            <div className="w-14 flex-shrink-0" aria-hidden="true">
              {/* Dummy element to force sidebar to shrink to fit close icon */}
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="flex flex-shrink-0 flex-col items-start px-4 pt-5 pb-2">
            <Link href="/" passHref legacyBehavior={false}>
              <div>
                <span className="block h-8 w-auto font-bold text-primary text-xl">GULL LAKE</span>
                <span className="block text-xs">
                  {featuredTournament?.data?.teams && Array.isArray(featuredTournament.data.teams) && featuredTournament.data.teams.length >= 2 ? (
                    <>
                      <span className="text-green-700 font-medium">
                        {typeof featuredTournament.data.teams[0] === 'object' ? featuredTournament.data.teams[0].name : featuredTournament.data.teams[0]}
                      </span> <span className="text-gray-500">vs.</span> <span className="text-red-700 font-medium">
                        {typeof featuredTournament.data.teams[1] === 'object' ? featuredTournament.data.teams[1].name : featuredTournament.data.teams[1]}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-500">Golf Tournament</span>
                  )}
                </span>
              </div>
            </Link>
            <Link
              href="/tournaments/new"
              passHref
              legacyBehavior={false}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
              New Tournament
            </Link>
          </div>
          
          <div className="flex flex-1 flex-col overflow-y-auto pt-1">
            {/* Main navigation */}
            <nav className="flex-1 space-y-1 px-2 py-2">
              {navigation.map((item) => {
                const isActive = router.pathname.startsWith(item.href);
                
                // Enhanced tournament item with countdown
                if (item.enhanced && featuredTournament) {
                  return (
                    <div key={item.name} className="space-y-1">
                      <Link
                        href={item.href}
                        passHref
                        legacyBehavior={false}
                        className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium ${isActive
                          ? 'bg-primary text-white'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                      >
                        <item.icon
                          className={`mr-3 h-6 w-6 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'}`}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                      
                      {/* Tournament Quick Access Card */}
                      <Link
                        href={`/tournaments/${featuredTournament.data.id}`}
                        className="ml-9 mb-1 block rounded-md border border-gray-200 hover:border-primary hover:shadow-sm bg-white p-2 transition-all"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-xs truncate max-w-[120px]">
                            {featuredTournament.data.name}
                          </span>
                          <TournamentCountdownMini 
                            targetDate={featuredTournament.status === 'upcoming' ? featuredTournament.data.startDate : featuredTournament.data.endDate} 
                            status={featuredTournament.status} 
                          />
                        </div>
                        
                        {/* Prize pool */}
                        {featuredTournament.data.totalPrize && (
                          <div className="mb-1 text-xs text-gray-700 flex items-center">
                            <TrophyIcon className="h-3 w-3 mr-1 text-yellow-500" />
                            Prize Pool: ${featuredTournament.data.totalPrize.toLocaleString()}
                          </div>
                        )}
                        
                        <div className="flex space-x-1">
                          {/* Team chips */}
                          {featuredTournament.data.teams && Array.isArray(featuredTournament.data.teams) ? 
                            // Map through the team names (API returns array of strings)
                            featuredTournament.data.teams.slice(0, 2).map((team: any) => {
                              // Handle both object and string formats
                              const teamName = typeof team === 'object' ? team.name : team;
                              return (
                                <span 
                                  key={teamName}
                                  className={`text-xs rounded-full px-2 py-0.5 ${
                                    teamName === 'Spartan Dawgs' ? 
                                    'bg-green-100 text-green-700' : 
                                    'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {teamName}
                                </span>
                              );
                            })
                            : 
                            // Fallback when teams array is empty or not available
                            <>
                              <span className="text-xs rounded-full px-2 py-0.5 bg-green-100 text-green-700">
                                Spartan Dawgs
                              </span>
                              <span className="text-xs rounded-full px-2 py-0.5 bg-red-100 text-red-700">
                                Invited Guests
                              </span>
                            </>
                          }
                        </div>
                      </Link>
                    </div>
                  );
                }
                
                // Regular navigation items
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    passHref
                    legacyBehavior={false}
                    className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium ${isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <item.icon
                      className={`mr-3 h-6 w-6 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'}`}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            
            {/* User navigation - desktop version */}
            <div className="mt-6 pt-6 border-t border-gray-200 px-2 pb-6">
              <div className="flex items-center px-2 mb-3">
                <img
                  className="h-8 w-8 rounded-full"
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  alt=""
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-700">{userInfo.name}</div>
                  <div className="text-xs text-gray-500 flex items-center">
                    {userInfo.role === 'ADMIN' && (
                      <span className="px-1.5 py-0.5 mr-1 text-xs font-medium rounded-full bg-primary/10 text-primary">Admin</span>
                    )}
                    {userInfo.email}
                  </div>
                </div>
              </div>
              {userNavigation.map((item) => {
                const isActive = router.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    passHref
                    legacyBehavior={false}
                    className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium ${isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <item.icon
                      className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                );
              })}
              <button
                onClick={logout}
                className="group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                <XMarkIcon
                  className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
                  aria-hidden="true"
                />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
