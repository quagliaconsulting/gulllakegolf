import React from 'react';

interface Tab {
  id: string;
  name: string;
}

interface TabNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  setActiveTab
}) => {
  // Define tabs with their labels and IDs
  const tabs: Tab[] = [
    { id: 'overview', name: 'Overview' },
    { id: 'schedule', name: 'Schedule & Matches' },
    { id: 'scorecards', name: 'Scorecards' },
    { id: 'leaderboard', name: 'Leaderboard' },
    { id: 'teams', name: 'Teams & Players' },
    { id: 'money', name: 'Money' },
    { id: 'settings', name: 'Settings' }
  ];

  return (
    <div className="mt-6 sm:mt-8 border-b border-gray-200">
      <div className="sm:flex sm:items-baseline">
        <div className="mt-4 sm:mt-0">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default TabNavigation;