# OrionCare — Overview

## Qué es
OrionCare es un sistema de agenda + recordatorios por WhatsApp para clínicas/consultorios.
Incluye portal admin/secretaría, portal médico y automatizaciones.

## Roles
- Admin: configura doctores/usuarios/horarios y ve todo.
- Secretary: gestiona pacientes y citas.
- Doctor: ve (y según reglas, actualiza) sus citas.

## Flujos principales
1) Crear cita (secretaría/admin)
2) Consultar disponibilidad (días/slots)
3) Confirmar / reagendar por WhatsApp
4) Recordatorios automáticos
5) Tracking de estado de mensajes (Twilio status webhook)

## Integraciones
- Supabase (DB + RLS + Edge Functions)
- Twilio WhatsApp (envío y webhooks)
- Cron/automatización (send-reminders)

## Producción vs Staging
- Twilio: misma configuración y mismo número (se replica igual).
- DB: NO se copia para no afectar producción mientras ajustamos Edge Functions.
