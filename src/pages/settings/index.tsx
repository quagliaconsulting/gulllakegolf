import React from 'react';

export default function SettingsPage() {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>
        
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Notification Settings</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Manage your notification preferences</p>
            </div>
            <div className="mt-5 space-y-4">
              <div className="relative flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="email-notifications"
                    name="email-notifications"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    defaultChecked
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="email-notifications" className="font-medium text-gray-700">
                    Email notifications
                  </label>
                  <p className="text-gray-500">Get email notifications for tournament updates</p>
                </div>
              </div>
              <div className="relative flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="push-notifications"
                    name="push-notifications"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    defaultChecked
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="push-notifications" className="font-medium text-gray-700">
                    Push notifications
                  </label>
                  <p className="text-gray-500">Receive browser push notifications</p>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Account Settings</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Manage your account information</p>
            </div>
            <div className="mt-5">
              <button
                type="button"
                className="btn-secondary"
              >
                Change Password
              </button>
            </div>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Danger Zone</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Permanently delete your account and all of your data</p>
            </div>
            <div className="mt-5">
              <button
                type="button"
                className="inline-flex items-center rounded-md border border-transparent bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
