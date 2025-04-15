import { useState, useEffect } from 'react';
import { SelectOption } from '../../../types/models';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import { ArrowLeftIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const reportTypes = [
  { id: 'tournament-summary', name: 'Tournament Summary', description: 'Overall tournament results and statistics' },
  { id: 'team-standings', name: 'Team Standings', description: 'Detailed team standings and performance metrics' },
  { id: 'player-statistics', name: 'Player Statistics', description: 'Individual player performance statistics' },
  { id: 'match-results', name: 'Match Results', description: 'Detailed results for all matches' },
  { id: 'scorecards', name: 'Scorecards', description: 'Printable scorecards with player names and handicaps' },
];

const exportFormats = [
  { id: 'pdf', name: 'PDF Document', description: 'Best for printing and sharing' },
  { id: 'excel', name: 'Excel Spreadsheet', description: 'Good for further analysis and data manipulation' },
  { id: 'csv', name: 'CSV File', description: 'Simple format for importing into other systems' },
];

export default function GenerateReport() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tournaments, setTournaments] = useState<SelectOption[]>([]);
  const [formData, setFormData] = useState({
    tournamentId: '',
    reportType: '',
    exportFormat: 'pdf',
    includeCharts: true,
    includeScorecards: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch tournaments for the dropdown
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        // In a real implementation, this would fetch from the API
        // const response = await axios.get('/api/tournaments');
        // setTournaments(response.data);
        
        // For demo purposes, we'll use this dummy data
        // No tournaments available
        setTournaments([]);
      } catch (error) {
        console.error('Error fetching tournaments:', error);
      }
    };

    fetchTournaments();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.tournamentId) {
      newErrors.tournamentId = 'Please select a tournament';
    }
    
    if (!formData.reportType) {
      newErrors.reportType = 'Please select a report type';
    }
    
    if (!formData.exportFormat) {
      newErrors.exportFormat = 'Please select an export format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Submit to the API
      const response = await axios.post('/api/reports/generate', formData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Report generated:', response.data);
      
      // Get report details
      const reportName = reportTypes.find(r => r.id === formData.reportType)?.name || 'Report';
      const tournamentName = tournaments.find(t => t.id === formData.tournamentId)?.name || 'Tournament';
      const fileExt = formData.exportFormat === 'pdf' ? 'pdf' : formData.exportFormat === 'excel' ? 'xlsx' : 'csv';
      
      // Create download link
      if (response.data.fileUrl) {
        const downloadLink = document.createElement('a');
        downloadLink.href = response.data.fileUrl;
        downloadLink.download = `${reportName}_${tournamentName}.${fileExt}`;
        downloadLink.click();
      }
      
      alert(`${reportName} for ${tournamentName} generated successfully! (${fileExt.toUpperCase()} format)`);
      router.push('/reports');
    } catch (error: any) {
      console.error('Error generating report:', error);
      alert(error.response?.data?.error || 'Failed to generate report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Generate Report | Gull Lake Golf Tournament</title>
      </Head>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/reports" className="flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="mr-1 h-4 w-4" /> Back to Reports
          </Link>
        </div>

        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Generate Report
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8">
              <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                <div className="sm:col-span-6">
                  <label htmlFor="tournamentId" className="block text-sm font-medium leading-6 text-gray-900">
                    Tournament
                  </label>
                  <div className="mt-2">
                    <select
                      id="tournamentId"
                      name="tournamentId"
                      value={formData.tournamentId}
                      onChange={handleChange}
                      className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ${
                        errors.tournamentId ? 'ring-red-500' : 'ring-gray-300'
                      } focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6`}
                    >
                      <option value="">Select a tournament</option>
                      {tournaments.map((tournament) => (
                        <option key={tournament.id} value={tournament.id}>
                          {tournament.name}
                        </option>
                      ))}
                    </select>
                    {errors.tournamentId && (
                      <p className="mt-2 text-sm text-red-600">{errors.tournamentId}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8">
              <div>
                <h3 className="text-base font-semibold leading-6 text-gray-900">Report Type</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select the type of report you want to generate.
                </p>
                
                <div className="mt-5 space-y-4">
                  <fieldset>
                    <legend className="sr-only">Report Type</legend>
                    <div className="space-y-4">
                      {reportTypes.map(reportType => (
                        <div key={reportType.id} className="relative flex items-start">
                          <div className="flex h-6 items-center">
                            <input
                              id={reportType.id}
                              name="reportType"
                              type="radio"
                              value={reportType.id}
                              checked={formData.reportType === reportType.id}
                              onChange={handleChange}
                              className="h-4 w-4 rounded-full border-gray-300 text-primary focus:ring-primary"
                            />
                          </div>
                          <div className="ml-3 text-sm leading-6">
                            <label htmlFor={reportType.id} className="font-medium text-gray-900">
                              {reportType.name}
                            </label>
                            <p className="text-gray-500">{reportType.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {errors.reportType && (
                      <p className="mt-2 text-sm text-red-600">{errors.reportType}</p>
                    )}
                  </fieldset>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8">
              <div>
                <h3 className="text-base font-semibold leading-6 text-gray-900">Export Options</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure how you want the report to be exported.
                </p>
                
                <div className="mt-5 space-y-6">
                  <fieldset>
                    <legend className="text-sm font-medium text-gray-900">Export Format</legend>
                    <div className="mt-3 space-y-4">
                      {exportFormats.map(format => (
                        <div key={format.id} className="relative flex items-start">
                          <div className="flex h-6 items-center">
                            <input
                              id={format.id}
                              name="exportFormat"
                              type="radio"
                              value={format.id}
                              checked={formData.exportFormat === format.id}
                              onChange={handleChange}
                              className="h-4 w-4 rounded-full border-gray-300 text-primary focus:ring-primary"
                            />
                          </div>
                          <div className="ml-3 text-sm leading-6">
                            <label htmlFor={format.id} className="font-medium text-gray-900">
                              {format.name}
                            </label>
                            <p className="text-gray-500">{format.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </fieldset>
                  
                  <fieldset>
                    <legend className="text-sm font-medium text-gray-900">Include in Report</legend>
                    <div className="mt-3 space-y-4">
                      <div className="relative flex items-start">
                        <div className="flex h-6 items-center">
                          <input
                            id="includeCharts"
                            name="includeCharts"
                            type="checkbox"
                            checked={formData.includeCharts}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </div>
                        <div className="ml-3 text-sm leading-6">
                          <label htmlFor="includeCharts" className="font-medium text-gray-900">
                            Charts and Graphs
                          </label>
                          <p className="text-gray-500">Include visual representations of data</p>
                        </div>
                      </div>
                      
                      <div className="relative flex items-start">
                        <div className="flex h-6 items-center">
                          <input
                            id="includeScorecards"
                            name="includeScorecards"
                            type="checkbox"
                            checked={formData.includeScorecards}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </div>
                        <div className="ml-3 text-sm leading-6">
                          <label htmlFor="includeScorecards" className="font-medium text-gray-900">
                            Detailed Scorecards
                          </label>
                          <p className="text-gray-500">Include hole-by-hole scores for each match</p>
                        </div>
                      </div>
                    </div>
                  </fieldset>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              href="/reports"
              className="rounded-md px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ml-3 inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Generating...
                </>
              ) : (
                <>
                  <DocumentTextIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                  Generate Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}