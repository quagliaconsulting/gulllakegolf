import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { FlagIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface CtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  holeId: string;
  holeName: string;
  players: any[];
  onSave: (holeId: string, playerId: string, distance: string) => void;
  currentWinnerId?: string | null;
}

export const CtpModal: React.FC<CtpModalProps> = ({
  isOpen,
  onClose,
  holeId,
  holeName,
  players,
  onSave,
  currentWinnerId
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(currentWinnerId || '');
  const [distance, setDistance] = useState<string>('');
  
  // Reset form when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedPlayerId(currentWinnerId || '');
      setDistance('');
    }
  }, [isOpen, currentWinnerId]);

  const handleSave = () => {
    if (!selectedPlayerId) {
      alert('Please select a player');
      return;
    }
    
    onSave(holeId, selectedPlayerId, distance);
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm rounded bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-medium text-gray-900 flex items-center">
              <FlagIcon className="h-5 w-5 text-green-600 mr-2" />
              Closest to Pin: {holeName}
            </Dialog.Title>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="player-select" className="block text-sm font-medium text-gray-700 mb-1">
                Select Winner
              </label>
              <select
                id="player-select"
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              >
                <option value="">-- Select Player --</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} ({player.isHomeTeam ? 'Home' : 'Away'})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="distance" className="block text-sm font-medium text-gray-700 mb-1">
                Distance to Pin (optional)
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  name="distance"
                  id="distance"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="block w-full flex-1 rounded-md border-gray-300 focus:border-primary focus:ring-primary sm:text-sm"
                  placeholder="e.g. 2ft 6in or 30in"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enter distance in feet, inches, or both (e.g. "5ft 4in" or "64in")
              </p>
            </div>
            
            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 sm:mt-0"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onClick={handleSave}
              >
                Save
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default CtpModal;