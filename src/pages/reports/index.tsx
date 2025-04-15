import React, { useState, useEffect, ChangeEvent } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Report } from '../../types/models';

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');

  const reportTypes = [
    { id: '', name: 'All Types' },
    { id: 'tournament-summary', name: 'Tournament Summary' },
    { id: 'team-standings', name: 'Team Standings' },
    { id: 'player-statistics', name: 'Player Statistics' },
    { id: 'match-results', name: 'Match Results' },
    { id: 'scorecard', name: 'Scorecard Templates' },
  ];

  const reportFormats = [
    { id: '', name: 'All Formats' },
    { id: 'pdf', name: 'PDF' },
    { id: 'excel', name: 'Excel' },
    { id: 'csv', name: 'CSV' },
  ];

  useEffect(() => {
    // Fetch reports from the API
    const fetchReports = async () => {
      try {
        const response = await axios.get('/api/reports', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        setReports(response.data);
      } catch (err: any) {
        console.error('Error fetching reports:', err);
        setError('Failed to load reports. Please try again later.');
        
        // No reports available
        setReports([]);

      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedType(e.target.value);
  };

  const handleFormatChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedFormat(e.target.value);
  };

  const filteredReports = reports.filter(report => {
    if (selectedType && report.type !== selectedType) return false;
    if (selectedFormat && report.format !== selectedFormat) return false;
    return true;
  });

  const formatTypeLabel = (type: string) => {
    const found = reportTypes.find(t => t.id === type);
    return found ? found.name : type;
  };

  const formatFormatLabel = (format: string) => {
    const found = reportFormats.find(f => f.id === format);
    return found ? found.name : format.toUpperCase();
  };

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading reports...</div>;
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Tournament Reports</h1>
          <p className="mt-2 text-sm text-gray-700">
            View and export tournament results and statistics.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            href="/reports/generate"
            className="btn-primary inline-flex"
          >
            Generate Report
          </Link>
        </div>
      </div>
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {/* Filters */}
      <div className="mt-6 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
        <div className="sm:w-1/4">
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
            Report Type
          </label>
          <select
            id="type"
            value={selectedType}
            onChange={handleTypeChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            {reportTypes.map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="sm:w-1/4">
          <label htmlFor="format" className="block text-sm font-medium text-gray-700">
            Format
          </label>
          <select
            id="format"
            value={selectedFormat}
            onChange={handleFormatChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            {reportFormats.map(format => (
              <option key={format.id} value={format.id}>
                {format.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {filteredReports.length === 0 ? (
        <div className="mt-8 bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
          <div className="p-8 text-center text-gray-500">
            <p>No reports found. Generate some reports to get started!</p>
          </div>
        </div>
      ) : (
        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Report Name
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Tournament
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Type
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Format
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Created
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredReports.map((report) => (
                      <tr key={report.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {report.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {report.tournament?.name} ({report.tournament?.year})
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {formatTypeLabel(report.type)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                            report.format === 'pdf' ? 'bg-red-50 text-red-700' :
                            report.format === 'excel' ? 'bg-green-50 text-green-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {formatFormatLabel(report.format)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {formatDate(report.createdAt)}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <a
                            href={report.fileUrl}
                            download
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Download
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
