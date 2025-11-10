'use client';

import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableRowSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <tr className="animate-pulse">
      {[...Array(columns)].map((_, i) => (
        <td key={i} className="whitespace-nowrap px-6 py-4">
          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
        </td>
      ))}
    </tr>
  );
}

export default function TableSkeleton({
  rows = 5,
  columns = 6,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {[...Array(columns)].map((_, i) => (
              <th key={i} className="px-6 py-3 text-left">
                <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
          {[...Array(rows)].map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

