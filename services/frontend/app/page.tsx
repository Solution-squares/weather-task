'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import TableSkeleton from '@/components/ui/TableSkeleton';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import Pagination from '@/components/ui/Pagination';
import { formatTime, formatDate } from '@/lib/utils';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/components/ui/ToastContainer';
import { PAGINATION, REFETCH_INTERVALS, JOB_REFETCH_DELAY } from '@/lib/constants';

interface Job {
  id: number;
  type: string;
  jobType?: string;
  city?: string;
  timestamp: string;
  createdAt: string;
  status?: string;
}

interface JobResponse {
  success: boolean;
  data: Job[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function fetchJobs(page: number, limit: number): Promise<JobResponse> {
  const response = await fetch(`/api/jobs?page=${page}&limit=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to fetch job history');
  }
  return response.json();
}

async function createJob(): Promise<{ success: boolean; jobId: string; status: string }> {
  const response = await fetch('/api/job', {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to create job');
  }
  return response.json();
}

export default function Dashboard() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(PAGINATION.DEFAULT_PAGE);
  const [pageSize] = useState<number>(PAGINATION.JOBS_PAGE_SIZE);

  // Real-time connection indicator
  const { isConnected } = useSocket();

  const { data: jobsData, isLoading, error, refetch } = useQuery<JobResponse>({
    queryKey: ['jobs', currentPage, pageSize],
    queryFn: () => fetchJobs(currentPage, pageSize),
    refetchInterval: REFETCH_INTERVALS.JOBS,
  });

  const createJobMutation = useMutation({
    mutationFn: createJob,
    onSuccess: (response) => {
      console.log(response);
      showToast('Weather fetch job enqueued successfully!', 'success');
      // Refetch job history after a short delay
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        setCurrentPage(PAGINATION.DEFAULT_PAGE); // Reset to first page to see new job
      }, JOB_REFETCH_DELAY);
    },
    onError: (error: Error) => {
      showToast(`Failed to create job: ${error.message}`, 'error');
    },
  });

  const handleFetchWeather = async () => {
    setIsCreatingJob(true);
    try {
      await createJobMutation.mutateAsync();
    } finally {
      setIsCreatingJob(false);
    }
  };

  const jobs = jobsData?.data || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage weather data fetching jobs
          </p>
        </div>

        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={handleFetchWeather}
            disabled={isCreatingJob}
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isCreatingJob ? 'Enqueueing...' : 'Fetch Weather Now'}
          </button>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isConnected ? 'Real-time connected' : 'Connecting...'}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Recent Job History
            </h2>
          </div>

          {isLoading && (
            <div className="p-6">
              <TableSkeleton rows={10} columns={6} />
            </div>
          )}

          {error && (
            <div className="p-8">
              <ErrorDisplay error={error} onRetry={() => refetch()} />
            </div>
          )}

          {!isLoading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Job Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      City
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        No job history available
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {job.id}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {job.type}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
                            {job.jobType || job.type}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${job.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : job.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300'}`}>
                            {job.status || 'pending'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {job.city || 'All Cities'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(job.timestamp)} {formatTime(job.timestamp)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && !error && jobsData?.pagination && (
            <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
              <Pagination
                currentPage={currentPage}
                totalPages={jobsData.pagination.totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
              <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, jobsData.pagination.total)} of {jobsData.pagination.total} jobs
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
