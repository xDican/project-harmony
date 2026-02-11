import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { exchangeOAuth } from '@/lib/whatsappApi';

type Status = 'loading' | 'success' | 'error';

export default function MetaOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    const error = searchParams.get('error');
    const errorDesc = searchParams.get('error_description');
    if (error) {
      setErrorMsg(errorDesc || error);
      setStatus('error');
      return;
    }

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (!code || !state) {
      setErrorMsg('Faltan parámetros de autorización (code o state).');
      setStatus('error');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/meta/callback`;
    const result = await exchangeOAuth(code, state, redirectUri);

    if (result.error) {
      setErrorMsg(result.error);
      setStatus('error');
      return;
    }

    if (result.data?.connected) {
      localStorage.setItem('meta_connected', 'true');
      setStatus('success');
      setTimeout(() => navigate('/configuracion/whatsapp', { replace: true }), 1500);
    } else {
      setErrorMsg('La conexión no se completó correctamente.');
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <h2 className="text-xl font-semibold">Conectando WhatsApp...</h2>
              <p className="text-sm text-muted-foreground">No cierre esta ventana.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
              <h2 className="text-xl font-semibold">Conectado correctamente</h2>
              <p className="text-sm text-muted-foreground">Redirigiendo a configuración…</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-10 w-10 text-destructive mx-auto" />
              <h2 className="text-xl font-semibold">Error de conexión</h2>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" onClick={() => navigate('/configuracion/whatsapp')}>
                Volver a configuración
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
