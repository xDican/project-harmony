import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { embeddedSignup, type EmbeddedSignupResult } from '@/lib/whatsappApi';
import { t } from '@/lib/i18n';

const META_APP_ID = import.meta.env.VITE_META_APP_ID as string;
const META_CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID as string;

// Module-level flag — persists across re-mounts in the same SPA session
let fbInitialized = false;

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (options: Record<string, unknown>) => void;
      login: (callback: (response: FBLoginResponse) => void, options: Record<string, unknown>) => void;
    };
  }
}

interface FBLoginResponse {
  status: string;
  authResponse?: {
    code?: string;
    accessToken?: string;
  };
}

interface MetaSessionInfo {
  waba_id: string;
  phone_number_id: string;
}

interface Props {
  onSuccess: (result: EmbeddedSignupResult) => void;
  onError?: (error: string) => void;
}

export default function MetaEmbeddedSignup({ onSuccess, onError }: Props) {
  const [sdkLoaded, setSdkLoaded] = useState(fbInitialized);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionInfoRef = useRef<MetaSessionInfo | null>(null);

  // Cargar el Facebook SDK dinámicamente
  useEffect(() => {
    if (fbInitialized) return; // Already initialized in this SPA session

    function doInit() {
      if (!META_APP_ID) {
        setError('Configuración de Meta incompleta. Contacta al soporte.');
        return;
      }
      window.FB!.init({
        appId: META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v21.0',
      });
      fbInitialized = true;
      setSdkLoaded(true);
    }

    if (window.FB) {
      doInit();
      return;
    }

    window.fbAsyncInit = doInit;

    // Avoid loading the script multiple times using an ID
    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      document.body.appendChild(script);
    }
  }, []);

  // Escuchar mensajes de Meta con la info de WABA y número
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.origin.includes('facebook.com')) return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'WA_EMBEDDED_SIGNUP' && data?.data) {
          const { waba_id, phone_number_id } = data.data;
          if (waba_id && phone_number_id) {
            sessionInfoRef.current = { waba_id, phone_number_id };
          }
        }
      } catch {
        // Ignorar mensajes con formato inesperado
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  async function handleLoginResponse(response: FBLoginResponse) {
    if (response.status === 'not_authorized') {
      setError(t('mes.denied'));
      setLoading(false);
      onError?.(t('mes.denied'));
      return;
    }

    const code = response.authResponse?.code;
    if (!code) {
      setError(t('mes.cancel'));
      setLoading(false);
      onError?.(t('mes.cancel'));
      return;
    }

    // Esperar brevemente a que llegue el message event con session info
    await new Promise((resolve) => setTimeout(resolve, 500));

    const sessionInfo = sessionInfoRef.current;
    if (!sessionInfo) {
      const errMsg = 'No se recibió información de WABA. Intenta nuevamente.';
      setError(errMsg);
      setLoading(false);
      onError?.(errMsg);
      return;
    }

    const result = await embeddedSignup({
      code,
      waba_id: sessionInfo.waba_id,
      phone_number_id: sessionInfo.phone_number_id,
    });

    if (result.error || !result.data) {
      const errMsg = result.error ?? 'Error desconocido';
      setError(errMsg);
      setLoading(false);
      onError?.(errMsg);
      return;
    }

    setLoading(false);
    onSuccess(result.data);
  }

  function handleConnectClick() {
    if (!window.FB || !fbInitialized) {
      setError('SDK de Meta no disponible. Recarga la página.');
      return;
    }

    setLoading(true);
    setError(null);
    sessionInfoRef.current = null;

    window.FB.login(
      (response: FBLoginResponse) => {
        // FB.login requires a synchronous callback — async logic is handled separately
        handleLoginResponse(response);
      },
      {
        config_id: META_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          sessionInfoVersion: 2,
        },
      },
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        onClick={handleConnectClick}
        disabled={!sdkLoaded || loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {t('mes.connecting')}
          </>
        ) : !sdkLoaded ? (
          t('mes.loading_sdk')
        ) : (
          t('mes.btn')
        )}
      </Button>
    </div>
  );
}
