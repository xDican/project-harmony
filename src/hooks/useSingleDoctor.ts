import { useDoctors } from './useDoctors';

export const useSingleDoctor = () => {
  const { data: doctors, isLoading, error } = useDoctors();
  const isSingleDoctorOrg = !isLoading && doctors.length === 1;
  const singleDoctor = isSingleDoctorOrg ? doctors[0] : null;
  return { doctors, singleDoctor, isSingleDoctorOrg, isLoading, error };
};
