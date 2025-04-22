import React from 'react';
import { UserGroupIcon, MapPinIcon, CalendarIcon } from '@heroicons/react/24/outline';
import TournamentCountdown from './TournamentCountdown';
import { formatDate, calculateDurationDays } from '../utils/dateUtils';

interface OverviewTabProps {
  tournament: any;
  schedulesData: any;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ tournament, schedulesData }) => {
  const countdownTarget = tournament.status === 'upcoming' 
    ? tournament.startDate 
    : tournament.status === 'active' 
    ? tournament.endDate 
    : null;

  // Calculate tournament stats
  const teamCount = tournament.teams?.length || 0;
  // Use either the top-level player count or calculate from teams
  const playerCount = tournament.players || 
    tournament.teams?.reduce((count: number, team: any) => 
      count + (team.players?.length || 0), 0) || 0;
  const matchCount = schedulesData?.schedules?.reduce((count: number, schedule: any) => 
    count + (schedule.matches?.length || 0), 0) || 0;
  const durationDays = calculateDurationDays(tournament.startDate, tournament.endDate);

  return (
    <div className="space-y-6">
      {/* Tournament statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-primary/10 p-3 rounded-md">
              <UserGroupIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Teams</h3>
              <p className="text-2xl font-semibold text-gray-900">{teamCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-primary/10 p-3 rounded-md">
              <UserGroupIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Players</h3>
              <p className="text-2xl font-semibold text-gray-900">{playerCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-primary/10 p-3 rounded-md">
              <CalendarIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Duration</h3>
              <p className="text-2xl font-semibold text-gray-900">{durationDays} days</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-primary/10 p-3 rounded-md">
              <MapPinIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Matches</h3>
              <p className="text-2xl font-semibold text-gray-900">{matchCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tournament details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Tournament Details</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-gray-900">{tournament.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Location</dt>
                  <dd className="mt-1 text-gray-900">{tournament.location}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                  <dd className="mt-1 text-gray-900">{formatDate(tournament.startDate)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">End Date</dt>
                  <dd className="mt-1 text-gray-900">{formatDate(tournament.endDate)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        tournament.status === 'upcoming'
                          ? 'bg-green-100 text-green-800'
                          : tournament.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tournament Type</dt>
                  <dd className="mt-1 text-gray-900">{tournament.type || 'Standard'}</dd>
                </div>
              </dl>
            </div>
          </div>

          {tournament.description && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 bg-gray-50">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Description</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                <p className="text-gray-700 whitespace-pre-line">{tournament.description}</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Countdown widget if tournament is upcoming or active */}
          {countdownTarget && (
            <TournamentCountdown 
              targetDate={countdownTarget} 
              status={tournament.status} 
            />
          )}

          {/* Recent activity or announcements could go here */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Quick Links</h3>
            </div>
            <div className="border-t border-gray-200">
              <div className="divide-y divide-gray-200">
                <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                  <span className="text-gray-700">View Schedule</span>
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                </div>
                <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                  <span className="text-gray-700">Teams & Players</span>
                  <UserGroupIcon className="h-5 w-5 text-gray-400" />
                </div>
                <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                  <span className="text-gray-700">Tournament Location</span>
                  <MapPinIcon className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;