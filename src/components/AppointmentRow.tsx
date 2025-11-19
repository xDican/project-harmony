import { Card, CardContent } from '@/components/ui/card';
import { Appointment } from '@/types/appointment';
import { Patient } from '@/types/patient';
import { Doctor } from '@/types/doctor';
import StatusBadge from './StatusBadge';
import { Clock, User, Stethoscope } from 'lucide-react';

interface AppointmentRowProps {
  appointment: Appointment & { patient: Patient; doctor: Doctor };
}

/**
 * AppointmentRow - Displays a single appointment with patient and doctor info
 * Shows time, patient name, doctor name, and status in a compact card layout
 */
const AppointmentRow = ({ appointment }: AppointmentRowProps) => {
  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {/* Left: Time */}
          <div className="flex items-center gap-2 text-muted-foreground min-w-[80px]">
            <Clock className="h-4 w-4" />
            <span className="font-semibold text-foreground">{appointment.time}</span>
          </div>

          {/* Middle: Patient and Doctor info */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">{appointment.patient.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Stethoscope className="h-4 w-4" />
              <span>{appointment.doctor.name}</span>
            </div>
            {appointment.notes && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                {appointment.notes}
              </p>
            )}
          </div>

          {/* Right: Status Badge */}
          <div className="flex items-center sm:justify-end">
            <StatusBadge status={appointment.status} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppointmentRow;
