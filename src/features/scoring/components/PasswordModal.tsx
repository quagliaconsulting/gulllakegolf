import React from 'react';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  passwordInput: string;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  onClose,
  passwordInput,
  onPasswordChange,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center">
      <div className="fixed inset-0 bg-black opacity-50"></div>
      <div className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium mb-4">Enter Password</h3>
        <p className="text-gray-600 mb-4">
          To lock this scorecard, please enter the admin password.
        </p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
            placeholder="Password"
            autoFocus
          />
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordModal;