import React, { useState, useEffect } from 'react';

interface TournamentCountdownProps {
  targetDate: string;
  status: string;
}

export const TournamentCountdown: React.FC<TournamentCountdownProps> = ({ targetDate, status }) => {
  const [countdown, setCountdown] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [countdownLabel, setCountdownLabel] = useState('');

  useEffect(() => {
    // Set up countdown timer
    const calculateCountdown = () => {
      // Force noon UTC to avoid timezone issues
      const now = new Date();
      const target = new Date(targetDate);
      target.setUTCHours(12, 0, 0, 0);

      // Different countdown logic based on tournament status
      if (status === 'upcoming') {
        setCountdownLabel('Starting in');
      } else if (status === 'active') {
        setCountdownLabel('Time remaining');
      } else {
        setCountdownLabel('Completed');
        return;
      }

      const difference = target.getTime() - now.getTime();
      
      // If the date has passed
      if (difference < 0) {
        if (status === 'upcoming') {
          setCountdownLabel('Started');
        } else if (status === 'active') {
          setCountdownLabel('Completed');
        }
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      // Calculate time units
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      setCountdown({ days, hours, minutes, seconds });
    };
    
    // Calculate initially
    calculateCountdown();
    
    // Set up interval
    const timer = setInterval(calculateCountdown, 1000);
    
    // Clean up interval
    return () => clearInterval(timer);
  }, [targetDate, status]);

  return (
    <div className="bg-white p-4 rounded-lg shadow mt-4">
      <h3 className="text-lg font-semibold mb-2">{countdownLabel}</h3>
      <div className="flex space-x-2 justify-between">
        <div className="bg-primary/5 rounded-lg py-1 px-2">
          <div className="text-lg font-bold text-primary">{countdown.days}</div>
          <div className="text-xs text-gray-500">Days</div>
        </div>
        <div className="bg-primary/5 rounded-lg py-1 px-2">
          <div className="text-lg font-bold text-primary">{countdown.hours}</div>
          <div className="text-xs text-gray-500">Hours</div>
        </div>
        <div className="bg-primary/5 rounded-lg py-1 px-2">
          <div className="text-lg font-bold text-primary">{countdown.minutes}</div>
          <div className="text-xs text-gray-500">Mins</div>
        </div>
        <div className="bg-primary/5 rounded-lg py-1 px-2">
          <div className="text-lg font-bold text-primary">{countdown.seconds}</div>
          <div className="text-xs text-gray-500">Secs</div>
        </div>
      </div>
    </div>
  );
};

export default TournamentCountdown;