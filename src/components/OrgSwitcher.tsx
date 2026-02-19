import { useState } from 'react';
import { useCurrentUser } from '@/context/UserContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Building2 } from 'lucide-react';

/**
 * OrgSwitcher - Dropdown to switch between organizations
 * Only renders when user belongs to more than one organization.
 */
export default function OrgSwitcher() {
  const { user, organizationId, switchOrganization } = useCurrentUser();
  const [switching, setSwitching] = useState(false);

  // Don't render if user has 0 or 1 organizations
  if (!user || !user.organizations || user.organizations.length <= 1) {
    return null;
  }

  const handleChange = async (newOrgId: string) => {
    if (newOrgId === organizationId || !switchOrganization) return;

    setSwitching(true);
    try {
      await switchOrganization(newOrgId);
    } catch (err) {
      console.error('Error switching org:', err);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Organizaci&oacute;n
        </span>
        {switching && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>
      <Select
        value={organizationId || ''}
        onValueChange={handleChange}
        disabled={switching}
      >
        <SelectTrigger className="w-full text-sm">
          <SelectValue placeholder="Seleccionar organizaci&oacute;n" />
        </SelectTrigger>
        <SelectContent>
          {user.organizations.map((org) => (
            <SelectItem key={org.organizationId} value={org.organizationId}>
              {org.organizationName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
