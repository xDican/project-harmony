import { useEffect, useState } from 'react';
import { searchPatients } from '@/lib/api';
import { Patient } from '@/types/patient';

/**
 * Hook to search patients with debounced input
 * Waits 300ms after user stops typing before searching
 * 
 * @param initialQuery - Optional initial search query
 * @returns Object with search results, loading state, error, query, and setter
 */
export const usePatientsSearch = (initialQuery: string = '') => {
  const [query, setQuery] = useState<string>(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState<string>(initialQuery);
  const [data, setData] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Debounce the search query (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    // Cleanup timeout on query change
    return () => clearTimeout(timer);
  }, [query]);

  // Perform search when debounced query changes
  useEffect(() => {
    // Skip search if query is empty or too short
    if (!debouncedQuery || debouncedQuery.trim().length === 0) {
      setData([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    searchPatients(debouncedQuery)
      .then((results) => {
        setData(results);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to search patients'));
        setData([]);
        setIsLoading(false);
      });
  }, [debouncedQuery]);

  return {
    data,
    isLoading,
    error,
    query,
    setQuery,
  };
};
