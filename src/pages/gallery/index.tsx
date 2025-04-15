import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import Image from 'next/image';
import { GalleryPhoto } from '../../types/models';

export default function GalleryPage() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  useEffect(() => {
    // Fetch photos from the API
    const fetchPhotos = async () => {
      try {
        const response = await axios.get('/api/gallery', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        const photosData = response.data;
        setPhotos(photosData);
        
        // Extract unique tags
        const tags = new Set();
        photosData.forEach((photo: GalleryPhoto) => {
          if (photo.tags) {
            photo.tags.split(',').forEach((tag: string) => {
              tags.add(tag.trim());
            });
          }
        });
        
        setAllTags(Array.from(tags) as string[]);
      } catch (err: any) {
        console.error('Error fetching photos:', err);
        setError('Failed to load photos. Please try again later.');
        
        // No photos available
        setPhotos([]);
        
        // No tags available
        setAllTags([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhotos();
  }, []);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const filteredPhotos = selectedTags.length === 0
    ? photos
    : photos.filter(photo => {
        if (!photo.tags) return false;
        const photoTags = photo.tags?.split(',').map(tag => tag.trim()) || [];
        return selectedTags.some(tag => photoTags.includes(tag));
      });

  const groupedPhotos = filteredPhotos.reduce<Record<string, GalleryPhoto[]>>((acc, photo) => {
    const tournament = photo.tournament?.name || 'Unknown Tournament';
    if (!acc[tournament]) {
      acc[tournament] = [];
    }
    acc[tournament].push(photo);
    return acc;
  }, {});

  if (isLoading) {
    return <div className="p-8 text-center">Loading gallery...</div>;
  }

  // Function to get correct image URL regardless of host
  const getImageUrl = (photo: GalleryPhoto) => {
    // If it's already a relative URL, use it directly
    if (photo.fileUrl.startsWith('/')) {
      return photo.fileUrl;
    }
    
    // Handle localhost URLs and convert them to relative paths
    try {
      const url = new URL(photo.fileUrl);
      return url.pathname;
    } catch (e) {
      // If parsing fails, return the original
      return photo.fileUrl;
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Photo Gallery</h1>
          <p className="mt-2 text-sm text-gray-700">
            Browse photos from tournaments and events.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            href="/gallery/upload"
            className="btn-primary inline-flex"
          >
            Upload Photos
          </Link>
        </div>
      </div>
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {/* Filter by tags */}
      {allTags.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700">Filter by tags:</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 text-sm rounded-full ${
                  selectedTags.includes(tag)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {Object.keys(groupedPhotos).length === 0 ? (
        <div className="mt-8 bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg">
          <div className="p-8 text-center text-gray-500">
            <p>No photos found. Upload some photos to get started!</p>
          </div>
        </div>
      ) : (
        Object.entries(groupedPhotos).map(([tournament, tournamentPhotos]) => (
          <div key={tournament} className="mt-8">
            <h2 className="text-xl font-medium text-gray-900">{tournament}</h2>
            <div className="mt-4 grid grid-cols-1 gap-y-8 gap-x-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {(tournamentPhotos as GalleryPhoto[]).map(photo => (
                <div key={photo.id} className="group relative">
                  <div className="aspect-h-3 aspect-w-4 overflow-hidden rounded-lg bg-gray-100">
                    <img
                      src={getImageUrl(photo)}
                      alt={photo.description || 'Tournament photo'}
                      className="object-cover object-center w-full h-full"
                      onError={(e) => {
                        // Simple fallback logic for broken images
                        const target = e.target as HTMLImageElement;
                        const baseUrl = window.location.origin;
                        
                        // Try adding the origin if it's a relative URL
                        if (target.src.startsWith('/')) {
                          target.src = `${baseUrl}${target.src}`;
                        }
                      }}
                    />
                    <div className="flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                      <div className="w-full bg-white bg-opacity-75 backdrop-blur-sm rounded-md p-2 text-sm text-gray-900">
                        {photo.description || 'Tournament photo'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">{photo.year}</p>
                    {photo.tags && (
                      <div className="mt-1">
                        {photo.tags?.split(',').map(tag => (
                          <span key={tag.trim()} className="inline-block mr-1 mb-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-800 rounded-full">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}