import { useEffect, useState } from 'react';
import { getDoctors } from '@/lib/api';
import type { Doctor } from '@/types/doctor';

/**
 * Hook to fetch all doctors
 * 
 * @returns Object with doctors data, loading state, and error
 */
export const useDoctors = () => {
  const [data, setData] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    getDoctors()
      .then((doctors) => {
        setData(doctors);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to fetch doctors'));
        setIsLoading(false);
      });
  }, []);

  return {
    data,
    isLoading,
    error,
  };
};
