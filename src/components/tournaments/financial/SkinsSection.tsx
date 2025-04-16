import React from 'react';
import { Tournament, SkinsResult } from '@/types/models';
import { calculateSkinsPrize } from '@/utils/prizeCalculator';

interface SkinsSectionProps {
  tournament: Tournament;
  skinsParticipants: number;
  skinsResults: SkinsResult[];
}

export default function SkinsSection({ 
  tournament, 
  skinsParticipants, 
  skinsResults 
}: SkinsSectionProps) {
  // Calculate prize per skin
  const skinsPrizePerHole = calculateSkinsPrize(
    tournament.skinsPrizeAmount || 0,
    skinsParticipants || 0,
    skinsResults?.length || 0
  );

  if (!tournament.hasSkins) return null;

  return (
    <section className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Skins Game</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-md font-medium mb-3">Skins Prizes</h4>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Skins Entry Fee:</span>
              <span className="font-medium">${tournament.skinsPrizeAmount || 0}/player</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Skins Participants:</span>
              <span className="font-medium">{skinsParticipants || 0} players</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Total Pot:</span>
              <span className="font-medium">${(tournament.skinsPrizeAmount || 0) * (skinsParticipants || 0)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Skins Recorded:</span>
              <span className="font-medium">{skinsResults?.length || 0}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Prize Per Skin:</span>
              <span className="font-medium">
                {skinsResults?.length ? `$${skinsPrizePerHole}` : 'No skins recorded yet'}
              </span>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="text-md font-medium mb-3">Skins Results</h4>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            {skinsResults?.length > 0 ? (
              <div className="space-y-2">
                {skinsResults.map((result: SkinsResult) => (
                  <div key={result.id} className="flex justify-between">
                    <span className="text-gray-600">
                      Hole {result.holeNumber}:
                    </span>
                    <span className="font-medium">
                      {result.player?.name} ({result.score})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No skins recorded yet</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}