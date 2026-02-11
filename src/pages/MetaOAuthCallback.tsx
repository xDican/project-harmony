import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { exchangeOAuth } from '@/lib/whatsappApi';
import { t } from '@/lib/i18n';

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
      setErrorMsg(t('cb.missing_params'));
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
      setErrorMsg(t('cb.not_completed'));
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
              <h2 className="text-xl font-semibold">{t('cb.connecting')}</h2>
              <p className="text-sm text-muted-foreground">{t('cb.do_not_close')}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
              <h2 className="text-xl font-semibold">{t('cb.success')}</h2>
              <p className="text-sm text-muted-foreground">{t('cb.redirecting')}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-10 w-10 text-destructive mx-auto" />
              <h2 className="text-xl font-semibold">{t('cb.error')}</h2>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" onClick={() => navigate('/configuracion/whatsapp')}>
                {t('cb.back')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
