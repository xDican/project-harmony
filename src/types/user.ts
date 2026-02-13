export type UserRole = 'admin' | 'secretary' | 'doctor';

export interface OrgMembership {
  organizationId: string;
  organizationName: string;
  role: UserRole;
  doctorId: string | null;
}

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;           // role in current org (backward compat)
  doctorId: string | null;  // backward compat
  organizationId: string;   // active org
  organizations: OrgMembership[]; // all orgs
}
