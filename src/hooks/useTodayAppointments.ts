import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useTodayAppointments = () => {
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['appointments', 'today', today],
    queryFn: () => api.appointments.getByDate(today),
  });
};
