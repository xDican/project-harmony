import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

const SUPABASE_URL = 'https://soxrlxvivuplezssgssq.supabase.co';

type Status = 'exchanging' | 'success' | 'error';

export default function MetaOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('exchanging');
  const [errorMsg, setErrorMsg] = useState('');

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthError = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  useEffect(() => {
    if (oauthError) {
      setStatus('error');
      setErrorMsg(errorDescription || oauthError);
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setErrorMsg('Missing authorization code or state parameter.');
      return;
    }

    const exchange = async () => {
      try {
        const redirectUri = `${window.location.origin}/auth/meta/callback`;
        const res = await fetch(`${SUPABASE_URL}/functions/v1/meta-oauth-exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state, redirect_uri: redirectUri }),
        });
        const data = await res.json();
        if (data.connected) {
          localStorage.setItem('meta_connected', 'true');
          setStatus('success');
          setTimeout(() => navigate('/settings/whatsapp'), 1500);
        } else {
          setStatus('error');
          setErrorMsg(data.error || 'Connection failed');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'Something went wrong');
      }
    };

    exchange();
  }, [code, state, oauthError, errorDescription, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>
            {status === 'exchanging' && 'Connecting...'}
            {status === 'success' && 'Connected ✅'}
            {status === 'error' && 'Connection Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'exchanging' && (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          )}
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <p className="text-sm text-muted-foreground">Redirecting to settings...</p>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">{errorMsg}</p>
              <Button asChild variant="outline">
                <Link to="/settings/whatsapp">Back to WhatsApp Settings</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
