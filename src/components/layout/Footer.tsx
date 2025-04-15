import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
        <div className="flex justify-center space-x-6 md:order-2">
          <Link href="/privacy" className="text-gray-400 hover:text-gray-500">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-gray-400 hover:text-gray-500">
            Terms of Service
          </Link>
          <Link href="/contact" className="text-gray-400 hover:text-gray-500">
            Contact Us
          </Link>
        </div>
        <div className="mt-8 md:order-1 md:mt-0">
          <p className="text-center text-xs leading-5 text-gray-500">
            &copy; {currentYear} Gull Lake Golf Tournament. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
