export interface Specialty {
  id: string;
  name: string;
}

export interface Doctor {
  id: string;
  name: string;
  prefix?: string;
  specialtyId?: string;
  specialtyName?: string;
  phone?: string;
  email?: string;
  createdAt?: string;
}
