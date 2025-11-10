'use client';

import { ApiError } from '@/types/weather';
import { cn } from '@/lib/utils';

interface ErrorDisplayProps {
  error: ApiError | Error | string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorDisplay({
  error,
  onRetry,
  className,
}: ErrorDisplayProps) {
  const errorMessage =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : error.message || 'An unexpected error occurred';

  return (
    <div
      className={cn(
        'rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20',
        className
      )}
    >
      <div className="mb-4 text-4xl">⚠️</div>
      <h3 className="mb-2 text-lg font-semibold text-red-900 dark:text-red-200">
        Error
      </h3>
      <p className="mb-4 text-red-700 dark:text-red-300">{errorMessage}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

