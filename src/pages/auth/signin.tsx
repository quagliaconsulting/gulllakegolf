import { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import Head from 'next/head';
import { useAuth } from '@/lib/authContext';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function SignIn() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Attempting login with:', data.email);
      const result = await login(data.email, data.password);
      console.log('Login result:', result);
      
      if (result.success) {
        console.log('Login successful');
        
        // For debugging, explicitly show what cookies are set
        console.log('Current cookies:', document.cookie);
        
        // Hide the form and show a success message
        setIsLoading(false);
        
        // Create a visible success message with buttons
        const debugSection = document.createElement('div');
        debugSection.style.marginTop = '20px';
        debugSection.innerHTML = `
          <div class="rounded-md bg-green-50 p-4">
            <div class="flex">
              <div class="ml-3">
                <h3 class="text-sm font-medium text-green-800">Login successful!</h3>
                <div class="mt-2 text-sm text-green-700">
                  <p>Token has been stored in cookies and localStorage.</p>
                </div>
                <div class="mt-4 flex space-x-4">
                  <a href="/auth/signup" 
                     class="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white 
                            shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 
                            focus-visible:outline-offset-2 focus-visible:outline-green-600">
                    Go to Sign Up
                  </a>
                  <a href="/dashboard" 
                     class="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white 
                            shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 
                            focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                    Go to Dashboard
                  </a>
                </div>
              </div>
            </div>
          </div>
        `;
        
        // Hide the form and show success message
        const form = document.querySelector('form');
        if (form) {
          // Hide the form
          form.style.display = 'none';
          
          // Insert success message
          if (form.parentNode) {
            form.parentNode.insertBefore(debugSection, form.nextSibling);
          }
        }
        
        // DO NOT auto-redirect - let user click buttons manually
      } else {
        console.log('Login failed:', result.error);
        setError(result.error || 'Invalid email or password');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign In | Gull Lake Golf Tournament</title>
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
      </Head>
      <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Welcome back to Gull Lake Golf Tournament
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className={`block w-full appearance-none rounded-md border px-3 py-2 placeholder-gray-400 shadow-sm focus:outline-none sm:text-sm ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary focus:ring-primary'}`}
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className={`block w-full appearance-none rounded-md border px-3 py-2 placeholder-gray-400 shadow-sm focus:outline-none sm:text-sm ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary focus:ring-primary'}`}
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    New to Gull Lake?
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <Link 
                  href="/auth/signup"
                  className="flex w-full justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Create an account
                </Link>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}