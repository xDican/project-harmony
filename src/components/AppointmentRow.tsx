import { Appointment } from '@/types/appointment';

interface AppointmentRowProps {
  appointment: Appointment;
}

const AppointmentRow = ({ appointment }: AppointmentRowProps) => {
  return (
    <div className="p-4 border rounded-md bg-card">
      <p className="text-card-foreground">
        Cita: {appointment.date} - {appointment.time}
      </p>
    </div>
  );
};

export default AppointmentRow;
