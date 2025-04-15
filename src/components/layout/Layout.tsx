import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import Footer from './Footer';

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className="flex">
        <main className="flex-1 px-3 py-4 sm:p-6 md:p-10 md:ml-64 pt-16 md:pt-6">
          {children}
        </main>
      </div>
      
      <Footer />
    </div>
  );
}
