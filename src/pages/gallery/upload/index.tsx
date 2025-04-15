import { useState, useEffect, useCallback } from 'react';
import { SelectOption } from '../../../types/models';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';
import { ArrowLeftIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function UploadPhotos() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tournaments, setTournaments] = useState<SelectOption[]>([]);
  const [formData, setFormData] = useState({
    tournamentId: '',
    description: '',
    tags: '',
    year: new Date().getFullYear(),
  });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);

  // Fetch tournaments for the dropdown
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        // Fetch data from the API
        const response = await axios.get('/api/tournaments', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        // Set tournaments from response
        if (Array.isArray(response.data)) {
          setTournaments(response.data);
        } else {
          console.error('Unexpected response format:', response.data);
        }
      } catch (error) {
        console.error('Error fetching tournaments:', error);
        // No tournaments available
        setTournaments([]);
      }
    };

    fetchTournaments();
  }, []);

  // Clean up previews when component unmounts
  useEffect(() => {
    return () => {
      previews.forEach(preview => URL.revokeObjectURL(preview));
    };
  }, [previews]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (newFiles: File[]) => {
    // Check if any files exceed the max size (10MB)
    const validFiles = newFiles.filter(file => file.size <= 10 * 1024 * 1024);
    
    if (validFiles.length !== newFiles.length) {
      setErrors(prev => ({
        ...prev,
        files: 'Some files exceed the maximum size limit of 10MB'
      }));
    } else {
      // Clear file error if it exists
      if (errors.files) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.files;
          return newErrors;
        });
      }
    }
    
    // Create and store previews
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    
    setPreviews(prev => [...prev, ...newPreviews]);
    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    
    // Revoke the preview URL to free memory
    URL.revokeObjectURL(previews[index]);
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.tournamentId) {
      newErrors.tournamentId = 'Please select a tournament';
    }
    
    if (files.length === 0) {
      newErrors.files = 'Please upload at least one photo';
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
      // Create FormData to send files to the API
      const formDataToSubmit = new FormData();
      formDataToSubmit.append('tournamentId', formData.tournamentId);
      formDataToSubmit.append('description', formData.description);
      formDataToSubmit.append('tags', formData.tags);
      formDataToSubmit.append('year', formData.year.toString());
      
      // Append all files
      files.forEach(file => {
        formDataToSubmit.append('photos', file);
      });
      
      // Submit to the API
      const response = await axios.post('/api/gallery/upload', formDataToSubmit, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Photos uploaded:', response.data);
      alert(`${files.length} photos uploaded successfully!`);
      router.push('/gallery');
    } catch (error: any) {
      console.error('Error uploading photos:', error);
      alert(error.response?.data?.error || 'Failed to upload photos. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Upload Photos | Gull Lake Golf Tournament</title>
      </Head>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/gallery" className="flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon className="mr-1 h-4 w-4" /> Back to Gallery
          </Link>
        </div>

        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Upload Photos
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8">
              <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                <div className="sm:col-span-3">
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
                      {tournaments.map((tournament: any) => (
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

                <div className="sm:col-span-3">
                  <label htmlFor="year" className="block text-sm font-medium leading-6 text-gray-900">
                    Year
                  </label>
                  <div className="mt-2">
                    <input
                      type="number"
                      name="year"
                      id="year"
                      min="2000"
                      max="2100"
                      value={formData.year}
                      onChange={handleChange}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>
                
                <div className="sm:col-span-6">
                  <label htmlFor="description" className="block text-sm font-medium leading-6 text-gray-900">
                    Description
                  </label>
                  <div className="mt-2">
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleChange}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                      placeholder="Describe these photos (optional)"
                    />
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="tags" className="block text-sm font-medium leading-6 text-gray-900">
                    Tags
                  </label>
                  <div className="mt-2">
                    <input
                      type="text"
                      name="tags"
                      id="tags"
                      value={formData.tags}
                      onChange={handleChange}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                      placeholder="Separate tags with commas (e.g. hole1, awards, celebrations)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
            <div className="px-4 py-6 sm:p-8">
              <div>
                <h3 className="text-base font-semibold leading-6 text-gray-900">Photo Upload</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Upload photos from the tournament. Maximum 10MB per file.
                </p>
                
                <div 
                  className={`mt-5 flex justify-center rounded-lg border border-dashed ${
                    dragActive ? 'border-primary bg-primary/5' : 'border-gray-900/25'
                  } px-6 py-10`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="text-center">
                    <PhotoIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                    <div className="mt-4 flex text-sm leading-6 text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md bg-white font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 hover:text-primary/90"
                      >
                        <span>Upload photos</span>
                        <input 
                          id="file-upload" 
                          name="file-upload" 
                          type="file" 
                          accept="image/*"
                          multiple
                          className="sr-only" 
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs leading-5 text-gray-600">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
                
                {errors.files && (
                  <p className="mt-2 text-sm text-red-600">{errors.files}</p>
                )}
                
                {previews.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-3">Selected Photos ({files.length})</h4>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                      {previews.map((preview, index) => (
                        <div key={index} className="relative rounded-lg overflow-hidden group">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="h-40 w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute top-2 right-2 rounded-full bg-black bg-opacity-50 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                            {files[index].name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              href="/gallery"
              className="rounded-md px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ml-3 inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70"
            >
              {isSubmitting ? 'Uploading...' : 'Upload Photos'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}