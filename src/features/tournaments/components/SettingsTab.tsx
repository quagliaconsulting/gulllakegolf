import React, { useState } from 'react';
import Link from 'next/link';
import { 
  PencilIcon, 
  TrashIcon, 
  ArrowPathIcon, 
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { formatDate } from '../utils/dateUtils';

interface SettingsTabProps {
  tournament: any;
  tournamentId: string;
  refreshTournament: () => Promise<any>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ 
  tournament, 
  tournamentId, 
  refreshTournament 
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteTournament = async () => {
    if (!confirm("Are you absolutely sure you want to delete this tournament? This action CANNOT be undone and will delete all associated data including teams, matches, and scores.")) {
      return;
    }
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete tournament: ${response.statusText}`);
      }
      
      // Redirect to tournaments list on success
      window.location.href = '/tournaments';
    } catch (error) {
      console.error('Error deleting tournament:', error);
      setDeleteError('Failed to delete tournament. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-xl font-semibold text-gray-900">Tournament Settings</h2>
          <p className="mt-2 text-sm text-gray-700">
            Manage tournament settings and configuration.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link
            href={`/tournaments/${tournamentId}/edit`}
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            <PencilIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            Edit Tournament
          </Link>
        </div>
      </div>

      {/* Basic Settings */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Basic Information</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Tournament Name</dt>
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
                      ? 'bg-blue-100 text-blue-800'
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
              <dt className="text-sm font-medium text-gray-500">Created At</dt>
              <dd className="mt-1 text-gray-900">
                {tournament.createdAt ? new Date(tournament.createdAt).toLocaleDateString() : 'N/A'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Tournament Statistics */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Tournament Statistics</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Teams</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {tournament.teams?.length || 0}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Players</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {tournament.teams?.reduce((count: number, team: any) => 
                  count + (team.players?.length || 0), 0) || 0}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-1 text-gray-900">
                {tournament.updatedAt ? new Date(tournament.updatedAt).toLocaleDateString() : 'N/A'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Management Actions</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="space-y-4">
            <div>
              <button
                type="button"
                onClick={() => refreshTournament()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowPathIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                Refresh Tournament Data
              </button>
              <p className="mt-1 text-xs text-gray-500">
                Reload all tournament data from the server.
              </p>
            </div>
            
            <div>
              <Link
                href={`/tournaments/${tournamentId}/batch-assign`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PencilIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                Batch Assign Players
              </Link>
              <p className="mt-1 text-xs text-gray-500">
                Assign multiple players to matches at once.
              </p>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
              >
                <TrashIcon className="-ml-1 mr-2 h-5 w-5 text-red-500" />
                Delete Tournament
              </button>
              <p className="mt-1 text-xs text-gray-500">
                Permanently delete this tournament and all associated data.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg font-semibold leading-6 text-gray-900">
                    Delete Tournament
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you absolutely sure you want to delete the tournament "{tournament.name}"? This action CANNOT be undone and will delete all associated data including teams, matches, and scores.
                    </p>
                  </div>
                </div>
              </div>
              
              {deleteError && (
                <div className="mt-3 rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{deleteError}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:col-start-2"
                  onClick={handleDeleteTournament}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Tournament'
                  )}
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsTab;