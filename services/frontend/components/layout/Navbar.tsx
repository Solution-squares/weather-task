'use client';

import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-xl font-bold text-gray-900 dark:text-white"
            >
              Weather System
            </Link>
            <div className="hidden gap-4 sm:flex">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                Dashboard
              </Link>
              <Link
                href="/weather"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                Weather Data
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
