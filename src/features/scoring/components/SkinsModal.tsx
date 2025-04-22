import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { StarIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SkinsModalProps {
  isOpen: boolean;
  onClose: () => void;
  holeNumber: number;
  holeName?: string;
  players: any[];
  onSave: (holeNumber: number, playerId: string, score: number) => void;
  currentWinnerId?: string | null;
  currentScore?: number | null;
}

export const SkinsModal: React.FC<SkinsModalProps> = ({
  isOpen,
  onClose,
  holeNumber,
  holeName,
  players,
  onSave,
  currentWinnerId,
  currentScore = 0
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(currentWinnerId || '');
  const [score, setScore] = useState<number>(currentScore || 0);
  
  // Reset form when dialog opens and auto-populate with potential winner
  useEffect(() => {
    if (isOpen) {
      // If we have a current winner, use that
      if (currentWinnerId) {
        setSelectedPlayerId(currentWinnerId);
        setScore(currentScore || 0);
      } else {
        // Find player with lowest score for this hole (auto-select potential winner)
        const potentialWinners = players.filter(p => {
          // For singles and best ball, individual player might have the best score
          // Each format will handle this differently, but we can detect based on player properties
          return p.isBestForHole === holeNumber || p.potentialSkinWinner === holeNumber;
        });
        
        // If we can identify the potential winner, auto-select them
        if (potentialWinners.length === 1) {
          setSelectedPlayerId(potentialWinners[0].id);
          console.log(`Auto-selected player ${potentialWinners[0].name} for skin on hole ${holeNumber}`);
        } else if (players.length > 0) {
          // Otherwise, we'll leave it blank or could use a different heuristic
          setSelectedPlayerId('');
        }
        
        setScore(currentScore || 0);
      }
    }
  }, [isOpen, currentWinnerId, currentScore, players, holeNumber]);

  const handleSave = () => {
    if (!selectedPlayerId) {
      alert('Please select a player');
      return;
    }
    
    if (score <= 0) {
      alert('Please enter a valid score');
      return;
    }
    
    onSave(holeNumber, selectedPlayerId, score);
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
              <StarIcon className="h-5 w-5 text-yellow-600 mr-2" />
              Record Skin: {holeName || `Hole ${holeNumber}`}
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
                Skin Winner
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
              <label htmlFor="score" className="block text-sm font-medium text-gray-700 mb-1">
                Winning Score
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="number"
                  name="score"
                  id="score"
                  value={score}
                  onChange={(e) => setScore(parseInt(e.target.value) || 0)}
                  className="block w-full flex-1 rounded-md border-gray-300 focus:border-primary focus:ring-primary sm:text-sm"
                  min="1"
                  max="15"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enter the gross score for the hole
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

export default SkinsModal;