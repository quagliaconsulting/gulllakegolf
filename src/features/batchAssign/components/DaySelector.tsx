import React from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';

interface Schedule {
  id: string;
  date: string;
  description?: string;
}

interface DaySelectorProps {
  schedules: Schedule[];
  selectedDay: string;
  onChange: (dayId: string) => void;
}

const DaySelector: React.FC<DaySelectorProps> = ({
  schedules,
  selectedDay,
  onChange
}) => {
  if (!schedules || schedules.length === 0) {
    return (
      <div className="text-sm text-gray-500 flex items-center">
        <CalendarIcon className="h-5 w-5 mr-1 text-gray-400" />
        No schedule days available
      </div>
    );
  }

  // Format the date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="day-filter" className="block text-sm font-medium text-gray-700">
        Filter by day:
      </label>
      <select
        id="day-filter"
        value={selectedDay}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
      >
        <option value="all">All Days</option>
        {schedules.map((day) => (
          <option key={day.id} value={day.id}>
            {formatDate(day.date)} {day.description ? `- ${day.description}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DaySelector;