import React from 'react';
import { Tournament } from '@/types/models';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  player: any;
  tournament: Tournament;
  paymentStatus: {
    buyIn: boolean;
    ctp: boolean;
    skins: boolean;
  };
  onPaymentChange: (field: string, value: boolean) => void;
  onSave: () => void;
  isSaving: boolean;
}

export default function PaymentDialog({
  isOpen,
  onClose,
  player,
  tournament,
  paymentStatus,
  onPaymentChange,
  onSave,
  isSaving
}: PaymentDialogProps) {
  if (!player) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900"
                >
                  Update Payment Status
                </Dialog.Title>
                
                <div className="mt-4 space-y-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Player: <span className="font-medium text-gray-900">{player.name}</span></p>
                    <p className="text-sm text-gray-500">Team: <span className="font-medium text-gray-900">{player.team?.name}</span></p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        id="buyIn"
                        type="checkbox"
                        checked={paymentStatus.buyIn}
                        onChange={(e) => onPaymentChange('buyIn', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="buyIn" className="ml-3 block text-sm font-medium text-gray-700">
                        Buy-in Paid (${tournament.buyIn})
                      </label>
                    </div>
                    
                    {tournament.hasCTP && (
                      <div className="flex items-center">
                        <input
                          id="ctp"
                          type="checkbox"
                          checked={paymentStatus.ctp}
                          onChange={(e) => onPaymentChange('ctp', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="ctp" className="ml-3 block text-sm font-medium text-gray-700">
                          CTP Entry (${tournament.ctpPrizeAmount || 0})
                        </label>
                      </div>
                    )}
                    
                    {tournament.hasSkins && (
                      <div className="flex items-center">
                        <input
                          id="skins"
                          type="checkbox"
                          checked={paymentStatus.skins}
                          onChange={(e) => onPaymentChange('skins', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="skins" className="ml-3 block text-sm font-medium text-gray-700">
                          Skins Entry (${tournament.skinsPrizeAmount || 0})
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    disabled={isSaving}
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    className="inline-flex justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
                    onClick={onSave}
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : 'Save'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}