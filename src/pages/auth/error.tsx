import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

export default function AuthError() {
  const router = useRouter();
  const { error } = router.query;

  // Map error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    AccessDenied: 'You do not have permission to access this resource.',
    Configuration: 'There is a problem with the server configuration.',
    CredentialsSignin: 'The email or password you entered is incorrect.',
    Default: 'An unexpected error occurred.',
    EmailSignin: 'The email could not be sent.',
    OAuthSignin: 'Error signing in with the provider.',
    OAuthCallback: 'Error handling the sign in callback.',
    OAuthCreateAccount: 'Could not create user in the database.',
    EmailCreateAccount: 'Could not create user in the database.',
    Callback: 'Something went wrong with the sign in callback.',
    OAuthAccountNotLinked: 'This account is already linked to another user.',
    SessionRequired: 'You must be signed in to access this page.',
    Verification: 'The verification token has expired or is invalid.',
  };

  const errorMessage = error ? (errorMessages[error as string] || errorMessages.Default) : errorMessages.Default;

  return (
    <>
      <Head>
        <title>Authentication Error | Gull Lake Golf Tournament</title>
      </Head>
      <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {errorMessage}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <p className="mb-4 text-gray-600">
              Please try signing in again or contact an administrator if the problem persists.
            </p>
            <Link
              href="/auth/signin"
              className="inline-flex justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}