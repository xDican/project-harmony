import { useQuery } from '@tanstack/react-query';
import { searchPatients } from '@/lib/api';
import { useState } from 'react';

export const usePatientsSearch = () => {
  const [query, setQuery] = useState('');
  
  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients', 'search', query],
    queryFn: () => searchPatients(query),
    enabled: query.length > 0,
  });
  
  return {
    query,
    setQuery,
    patients: patients || [],
    isLoading,
  };
};
