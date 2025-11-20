export interface Specialty {
  id: string;
  name: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialtyId?: string;
  specialtyName?: string;
  phone?: string;
  email?: string;
  createdAt?: string;
}
