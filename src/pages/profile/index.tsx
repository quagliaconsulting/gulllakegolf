import React from 'react';

export default function ProfilePage() {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Your Profile</h1>
        
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg p-6">
          <div className="flex items-center mb-6">
            <img
              className="h-24 w-24 rounded-full"
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
              alt=""
            />
            <div className="ml-6">
              <h2 className="text-xl font-medium text-gray-900">Tom Cook</h2>
              <p className="text-sm text-gray-500">tom@example.com</p>
              <button className="mt-2 text-sm text-primary hover:text-primary-dark">
                Change photo
              </button>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
              <div>
                <label htmlFor="first-name" className="block text-sm font-medium text-gray-700">
                  First name
                </label>
                <input
                  type="text"
                  name="first-name"
                  id="first-name"
                  autoComplete="given-name"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  defaultValue="Tom"
                />
              </div>
              <div>
                <label htmlFor="last-name" className="block text-sm font-medium text-gray-700">
                  Last name
                </label>
                <input
                  type="text"
                  name="last-name"
                  id="last-name"
                  autoComplete="family-name"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  defaultValue="Cook"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  autoComplete="email"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  defaultValue="tom@example.com"
                />
              </div>
              <div>
                <label htmlFor="handicap" className="block text-sm font-medium text-gray-700">
                  Handicap
                </label>
                <input
                  type="text"
                  name="handicap"
                  id="handicap"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  defaultValue="12.5"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className="btn-primary"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
