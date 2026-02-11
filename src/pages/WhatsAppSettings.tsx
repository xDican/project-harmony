import { useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

const SUPABASE_URL = 'https://soxrlxvivuplezssgssq.supabase.co';

export default function WhatsAppSettings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isConnected = localStorage.getItem('meta_connected') === 'true';

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const redirectUri = `${window.location.origin}/auth/meta/callback`;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/meta-oauth-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirect_uri: redirectUri }),
      });
      const data = await res.json();
      if (!res.ok || !data.authorize_url) {
        throw new Error(data.error || 'Failed to start OAuth flow');
      }
      window.location.href = data.authorize_url;
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">WhatsApp Settings</h1>

        {/* Meta Connection Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Meta Connection</CardTitle>
              <Badge variant={isConnected ? 'default' : 'secondary'}>
                {isConnected ? 'Connected ✅' : 'Not connected'}
              </Badge>
            </div>
            <CardDescription>
              Connect your WhatsApp Business account via Meta to send messages.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <Button onClick={handleConnect} disabled={loading || isConnected}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isConnected ? 'Already Connected' : 'Connect WhatsApp Business'}
            </Button>
          </CardContent>
        </Card>

        {/* Templates Card */}
        <Card>
          <CardHeader>
            <CardTitle>Templates</CardTitle>
            <CardDescription>
              Coming next — required for Meta review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled variant="outline">Manage Templates</Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
