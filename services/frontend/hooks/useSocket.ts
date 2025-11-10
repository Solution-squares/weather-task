'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/ToastContainer';

interface JobUpdateEvent {
  job: {
    id: number;
    jobId: string;
    jobType: string;
    cityName?: string;
    status: string;
    timestamp: string;
    createdAt: string;
  };
}

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  useEffect(() => {
    // Only connect on client side
    if (typeof window === 'undefined') {
      return;
    }

    const socketInstance = getSocket();
    if (!socketInstance) {
      return;
    }
    
    setSocket(socketInstance);

    const onConnect = () => {
      setIsConnected(true);
      console.log('Socket connected');
    };

    const onDisconnect = () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    };

    const onJobUpdate = (event: JobUpdateEvent) => {
      console.log('Job update received:', event);
      
      // Invalidate jobs query to refetch latest data
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      
      // Show toast notification based on job status
      const job = event.job;
      if (job.status === 'completed') {
        showToast(`Job ${job.jobId} completed successfully`, 'success');
      } else if (job.status === 'failed') {
        showToast(`Job ${job.jobId} failed`, 'error');
      } else if (job.status === 'processing') {
        showToast(`Job ${job.jobId} is now processing`, 'info');
      }
    };

    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);
    socketInstance.on('job-update', onJobUpdate);

    return () => {
      socketInstance.off('connect', onConnect);
      socketInstance.off('disconnect', onDisconnect);
      socketInstance.off('job-update', onJobUpdate);
    };
  }, [queryClient, showToast]);

  useEffect(() => {
    return () => {
      // Don't disconnect on unmount, keep connection alive
      // disconnectSocket();
    };
  }, []);

  return { socket, isConnected };
}

