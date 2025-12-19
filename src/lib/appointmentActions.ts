/**
 * Appointment Actions via Edge Functions
 * 
 * All appointment mutations go through the update-appointment edge function
 * to ensure consistent business logic and WhatsApp notifications.
 */

import { supabase } from './supabaseClient';

export interface CancelAppointmentResult {
  ok: boolean;
  error?: string;
}

export interface RescheduleAppointmentResult {
  ok: boolean;
  error?: string;
  isConflict?: boolean;
}

/**
 * Cancel an appointment via the update-appointment edge function
 */
export async function cancelAppointment(appointmentId: string): Promise<CancelAppointmentResult> {
  try {
    const { data, error } = await supabase.functions.invoke('update-appointment', {
      body: {
        appointmentId,
        action: 'cancel',
      },
    });

    if (error) {
      return { ok: false, error: error.message || 'Error al cancelar la cita' };
    }

    if (!data?.ok) {
      return { ok: false, error: data?.error || 'Error al cancelar la cita' };
    }

    return { ok: true };
  } catch (err: any) {
    console.error('Error canceling appointment:', err);
    return { ok: false, error: err?.message || 'Error inesperado al cancelar la cita' };
  }
}

/**
 * Reschedule an appointment via the update-appointment edge function
 */
export async function rescheduleAppointment(params: {
  appointmentId: string;
  date: string;
  time: string;
  durationMinutes?: number;
}): Promise<RescheduleAppointmentResult> {
  try {
    const { data, error } = await supabase.functions.invoke('update-appointment', {
      body: {
        appointmentId: params.appointmentId,
        action: 'reschedule',
        date: params.date,
        time: params.time,
        durationMinutes: params.durationMinutes ?? 60,
      },
    });

    if (error) {
      const isConflict = error.message?.toLowerCase().includes('ocupado');
      return { ok: false, error: error.message || 'Error al re-agendar la cita', isConflict };
    }

    if (!data?.ok) {
      const errorMsg = data?.error || 'Error al re-agendar la cita';
      const isConflict = errorMsg.toLowerCase().includes('ocupado');
      return { ok: false, error: errorMsg, isConflict };
    }

    return { ok: true };
  } catch (err: any) {
    console.error('Error rescheduling appointment:', err);
    const errorMsg = err?.message || 'Error inesperado al re-agendar la cita';
    const isConflict = errorMsg.toLowerCase().includes('ocupado');
    return { ok: false, error: errorMsg, isConflict };
  }
}
