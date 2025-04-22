import React from 'react';
import { Tournament } from '@/types/models';

interface PaymentManagementProps {
  tournament: Tournament;
  players: any[];
  playerPayments: Record<string, any>;
  onPlayerSelect: (player: any) => void;
}

export default function PaymentManagement({ 
  tournament, 
  players, 
  playerPayments,
  onPlayerSelect
}: PaymentManagementProps) {
  return (
    <section className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Payment Management</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Player</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Team</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Buy-in Paid</th>
              {tournament.hasCTP && (
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">CTP Entry</th>
              )}
              {tournament.hasSkins && (
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Skins Entry</th>
              )}
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {(players || []).map((player: any) => {
              // Access payment status safely with default values
              const playerPayment = playerPayments[player.id] || {};
              const buyInStatus = playerPayment.BUY_IN === true;
              const ctpStatus = playerPayment.CTP_ENTRY === true;
              const skinsStatus = playerPayment.SKINS_ENTRY === true;
              
              return (
                <tr key={player.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {player.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {player.team?.name || "No Team"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      buyInStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {buyInStatus ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  {tournament.hasCTP && (
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        ctpStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {ctpStatus ? 'Entered' : 'Not Entered'}
                      </span>
                    </td>
                  )}
                  {tournament.hasSkins && (
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        skinsStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {skinsStatus ? 'Entered' : 'Not Entered'}
                      </span>
                    </td>
                  )}
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <button
                      onClick={() => onPlayerSelect(player)}
                      className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}