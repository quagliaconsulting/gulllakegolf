import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRightIcon, CalendarIcon, MapPinIcon, TrophyIcon, UserGroupIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const [currentYear, setCurrentYear] = useState(2025);
  
  // Auto-update year based on current date
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);
  
  return (
    <>
      <Head>
        <title>Gull Lake Golf Tournament | Spring Classic</title>
        <meta name="description" content="The premier team-based golf tournament at Gull Lake. Join us for the Spring Classic and experience professional tournament management." />
        <meta property="og:title" content="Gull Lake Spring Classic Golf Tournament" />
        <meta property="og:description" content="Professional golf tournament management at Gull Lake, Michigan" />
      </Head>
      
      {/* Hero Section with Gradient Overlay */}
      <div className="relative isolate overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-white z-0"></div>
        
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex flex-col lg:flex-row lg:px-8 lg:py-32 relative z-10">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
            <div className="mt-10 sm:mt-16 lg:mt-8">
              <div className="inline-flex space-x-6">
                <span className="rounded-full bg-primary/20 px-3.5 py-1.5 text-sm font-semibold leading-6 text-primary ring-1 ring-inset ring-primary/30">
                  <span className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    {currentYear} Season
                  </span>
                </span>
                <span className="inline-flex items-center space-x-2 text-sm font-medium leading-6 text-gray-700">
                  <MapPinIcon className="h-4 w-4 text-primary" />
                  <span>Gull Lake, Michigan</span>
                </span>
              </div>
            </div>
            <h1 className="mt-8 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Spring Classic <span className="text-primary">Golf Tournament</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-700">
              The premier team-based golf tournament platform. Manage players, teams, courses, and scoring for your golf events with our comprehensive management system.
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              <Link href="/auth/signin" className="btn-primary flex items-center text-base">
                Sign In
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>
              <Link href="/auth/signup" className="text-base font-semibold leading-6 text-gray-900 hover:text-primary transition-colors">
                Create Account <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <div className="w-full mt-16 sm:mt-24 lg:mt-12">
            <div className="w-full mx-auto max-w-4xl">
              <div 
                className="w-full h-[30rem] sm:h-[35rem] rounded-xl bg-white shadow-2xl ring-1 ring-gray-400/10 flex items-center justify-center relative overflow-hidden"
              >
                {/* Dashboard UI mockup would go here - for now using style elements */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5"></div>
                <div className="absolute top-0 left-0 right-0 h-16 bg-white shadow-sm flex items-center justify-between px-8">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-primary"></div>
                    <span className="font-semibold text-gray-800">Gull Lake Tournament Dashboard</span>
                  </div>
                  <div className="flex space-x-4">
                    <div className="w-8 h-8 rounded-full bg-gray-100"></div>
                    <div className="w-8 h-8 rounded-full bg-gray-100"></div>
                  </div>
                </div>
                <div className="absolute top-16 left-0 bottom-0 w-48 sm:w-64 bg-gray-50 border-r border-gray-200">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="px-4 py-3 border-b border-gray-200 flex items-center">
                      <div className="w-4 h-4 rounded-full bg-primary/60 mr-3"></div>
                      <div className="h-4 bg-gray-200 rounded-full w-28 sm:w-36"></div>
                    </div>
                  ))}
                </div>
                <div className="absolute top-16 left-48 sm:left-64 right-0 bottom-0 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-8">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col">
                      <div className="flex justify-between items-center mb-4">
                        <div className="h-4 bg-gray-200 rounded-full w-24"></div>
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <div className="w-4 h-4 rounded-full bg-primary"></div>
                        </div>
                      </div>
                      <div className="h-40 bg-gray-50 rounded-md mb-3 flex items-center justify-center">
                        <div className="w-3/4 h-24 bg-gradient-to-r from-primary/40 to-secondary/40 rounded opacity-70"></div>
                      </div>
                      <div className="flex justify-between">
                        <div className="h-4 bg-gray-200 rounded-full w-20"></div>
                        <div className="h-4 bg-gray-200 rounded-full w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>
                <span className="text-sm sm:text-xl font-semibold text-primary z-10 absolute bottom-4 sm:bottom-8 right-4 sm:right-8 bg-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md shadow-sm">Gull Lake Golf</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Professional Tournament Management</h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Everything you need to run a successful golf tournament with team-based scoring and professional management.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-2xl sm:mt-16 lg:mt-20 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-6 gap-y-12 lg:max-w-none lg:grid-cols-3">
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <UserGroupIcon className="h-6 w-6 flex-none text-primary" aria-hidden="true" />
                  Team Management
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Create and manage teams, assign players, and track team performance throughout the tournament.
                  </p>
                  <p className="mt-6">
                    <Link href="/teams" className="text-sm font-semibold leading-6 text-primary">
                      Learn more <span aria-hidden="true">→</span>
                    </Link>
                  </p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <TrophyIcon className="h-6 w-6 flex-none text-primary" aria-hidden="true" />
                  Multiple Game Formats
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Support for Best Ball, Scramble, Alternate Shot, Chapman, and custom formats with configurable handicap adjustments.
                  </p>
                  <p className="mt-6">
                    <Link href="/tournaments/new" className="text-sm font-semibold leading-6 text-primary">
                      Create tournament <span aria-hidden="true">→</span>
                    </Link>
                  </p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <ChartBarIcon className="h-6 w-6 flex-none text-primary" aria-hidden="true" />
                  Real-time Scoring
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Mobile-friendly score entry with instant leaderboard updates and match play scoring logic.
                  </p>
                  <p className="mt-6">
                    <Link href="/schedule" className="text-sm font-semibold leading-6 text-primary">
                      View schedule <span aria-hidden="true">→</span>
                    </Link>
                  </p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Testimonial/CTA Section */}
      <div className="relative isolate overflow-hidden bg-primary/10 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:max-w-4xl">
            <figure className="mt-10">
              <blockquote className="text-center text-xl font-semibold leading-8 text-gray-900 sm:text-2xl sm:leading-9">
                <p>
                  "The Gull Lake Spring Classic has been our annual tradition for over a decade. This tournament management system has elevated our experience with professional scoring and organization."
                </p>
              </blockquote>
              <figcaption className="mt-10">
                <div className="mt-4 flex items-center justify-center space-x-3 text-base">
                  <div className="font-semibold text-gray-900">John Fairway</div>
                  <svg viewBox="0 0 2 2" width="3" height="3" aria-hidden="true" className="fill-gray-900">
                    <circle cx="1" cy="1" r="1" />
                  </svg>
                  <div className="text-gray-600">Tournament Director</div>
                </div>
              </figcaption>
            </figure>
            <div className="mt-16 flex items-center justify-center gap-x-6">
              <Link href="/tournaments/new" className="btn-primary">
                Register Your Tournament
              </Link>
              <Link href="/players" className="text-sm font-semibold leading-6 text-gray-900">
                Register as Player <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
