import '@/styles/globals.css';
import { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import Head from 'next/head';
import Script from 'next/script';
import Layout from '@/components/layout/Layout';
import { AuthProvider } from '@/lib/authContext';

const inter = Inter({ subsets: ['latin'] });

export default function App({ Component, pageProps }: AppProps) {
  // Check if the current page is a login/signup page
  const isAuthPage = Component.displayName?.startsWith('Auth') || 
                    Component.name?.startsWith('SignIn') || 
                    Component.name?.startsWith('SignUp') || 
                    (typeof window !== 'undefined' && 
                      (window.location.pathname.startsWith('/auth/signin') || 
                       window.location.pathname.startsWith('/auth/signup')));

  return (
    <AuthProvider>
      <Head>
        <title>Gull Lake Golf Tournament</title>
        <meta name="description" content="Golf tournament management application" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
      </Head>
      
      {/* Suppress browser console errors from vendor extensions */}
      <Script id="error-suppression" strategy="beforeInteractive">
        {`
          // Prevent certain console errors by providing empty listeners
          window.addEventListener('error', function(e) {
            if (e.message && (
              e.message.includes('No Listener: price_parity') ||
              e.message.includes('message channel closed')
            )) {
              e.stopImmediatePropagation();
              e.preventDefault();
              return true;
            }
          }, true);
        `}
      </Script>
      
      <main className={inter.className}>
        {/* Render without layout for auth pages */}
        {isAuthPage ? (
          <Component {...pageProps} />
        ) : (
          <Layout>
            <Component {...pageProps} />
          </Layout>
        )}
      </main>
    </AuthProvider>
  );
}
