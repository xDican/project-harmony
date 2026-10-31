import { useEffect, useState } from "react";

/** Cuenta regresiva "12 min" hasta `expiresAt`; "Vencida" si ya pasó (el cron la expira en ≤1 min). */
export function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const msLeft = new Date(expiresAt).getTime() - now;
  if (msLeft <= 0) return <span className="text-destructive">Vencida</span>;
  const min = Math.ceil(msLeft / 60_000);
  return <span>Vence en {min} min</span>;
}
