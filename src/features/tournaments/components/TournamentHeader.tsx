import React from 'react';
import Link from 'next/link';
import { formatDate } from '../utils/dateUtils';
import {
  CalendarIcon,
  MapPinIcon,
  TrophyIcon,
  PencilIcon,
  TableCellsIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

interface TournamentHeaderProps {
  tournament: any;
  id: string;
  setActiveTab: (tab: string) => void;
}

export const TournamentHeader: React.FC<TournamentHeaderProps> = ({
  tournament,
  id,
  setActiveTab
}) => {
  return (
    <>
      <div className="mb-8">
        <Link 
          href="/tournaments" 
          passHref 
          legacyBehavior={false} 
          className="flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="mr-1 h-4 w-4" /> Back to Tournaments
        </Link>
      </div>

      {/* Tournament header */}
      <div className="md:flex md:items-center md:justify-between md:space-x-5">
        <div className="flex items-start space-x-5">
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
                <TrophyIcon className="h-8 w-8 text-white" aria-hidden="true" />
              </div>
              <span className="absolute inset-0 rounded-full shadow-inner" aria-hidden="true" />
            </div>
          </div>
          <div className="pt-1.5">
            <h1 className="text-2xl font-bold text-gray-900">{tournament.name}</h1>
            <div className="flex items-center mt-2">
              <MapPinIcon className="h-5 w-5 text-gray-400" />
              <p className="text-sm font-medium text-gray-600 ml-1">{tournament.location}</p>
              <span className="mx-2 text-gray-300">|</span>
              <CalendarIcon className="h-5 w-5 text-gray-400" />
              <p className="text-sm font-medium text-gray-600 ml-1">
                {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
              </p>
            </div>
            <div className="mt-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  tournament.status === 'upcoming'
                    ? 'bg-blue-100 text-blue-800'
                    : tournament.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
        <div className="justify-stretch mt-6 flex flex-col-reverse space-y-4 space-y-reverse sm:flex-row-reverse sm:justify-end sm:space-y-0 sm:space-x-3 sm:space-x-reverse md:mt-0 md:flex-row md:space-x-3">
          <Link 
            href={`/tournaments/${id}/edit`} 
            passHref 
            legacyBehavior={false} 
            className="inline-flex items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            <PencilIcon className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-400" aria-hidden="true" />
            Edit
          </Link>
          <Link 
            href="#" 
            onClick={() => setActiveTab('schedule')} 
            passHref 
            legacyBehavior={false} 
            className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <TableCellsIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            View Matches
          </Link>
        </div>
      </div>
    </>
  );
};

export default TournamentHeader;