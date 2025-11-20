export type UserRole = 'admin' | 'secretary' | 'doctor';

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
  doctorId: string | null;
}
