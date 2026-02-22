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

// Known Meta/Facebook origins that can send the WA_EMBEDDED_SIGNUP message
const META_TRUSTED_ORIGINS = ['facebook.com', 'facebook.net', 'fbcdn.net', 'meta.com'];

export default function MetaEmbeddedSignup({ onSuccess, onError }: Props) {
  const [sdkLoaded, setSdkLoaded] = useState(fbInitialized);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionInfoRef = useRef<MetaSessionInfo | null>(null);
  const flowActiveRef = useRef(false);

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
      // Log ALL messages while flow is active (helps diagnose origin issues)
      if (flowActiveRef.current) {
        const dataPreview = typeof event.data === 'string'
          ? event.data.substring(0, 300)
          : JSON.stringify(event.data).substring(0, 300);
        console.log('[MetaEmbeddedSignup] postMessage during flow — origin:', event.origin, '| data:', dataPreview);
      }

      // Accept messages from any Meta/Facebook domain
      const isTrusted = META_TRUSTED_ORIGINS.some((o) => event.origin.includes(o));
      if (!isTrusted) return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'WA_EMBEDDED_SIGNUP') {
          console.log('[MetaEmbeddedSignup] WA_EMBEDDED_SIGNUP received:', JSON.stringify(data));
          const { waba_id, phone_number_id } = data.data ?? {};
          if (waba_id && phone_number_id) {
            sessionInfoRef.current = { waba_id, phone_number_id };
          } else {
            console.warn('[MetaEmbeddedSignup] WA_EMBEDDED_SIGNUP data incompleto:', JSON.stringify(data.data));
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

    // Esperar a que llegue el message event con session info.
    // El mensaje WA_EMBEDDED_SIGNUP puede llegar antes o después del callback de FB.login,
    // así que esperamos activamente en lugar de usar un delay fijo.
    const sessionInfo = await new Promise<MetaSessionInfo | null>((resolve) => {
      if (sessionInfoRef.current) {
        resolve(sessionInfoRef.current);
        return;
      }
      const timeout = setTimeout(() => {
        console.warn('[MetaEmbeddedSignup] Timeout esperando WA_EMBEDDED_SIGNUP (3s)');
        resolve(null);
      }, 3000);
      const poll = setInterval(() => {
        if (sessionInfoRef.current) {
          clearTimeout(timeout);
          clearInterval(poll);
          resolve(sessionInfoRef.current);
        }
      }, 50);
    });
    flowActiveRef.current = false;

    if (!sessionInfo) {
      // On mobile browsers the popup opens as a new tab, so postMessage never arrives.
      // Let the EF discover waba_id / phone_number_id via Meta's debug_token API.
      console.warn('[MetaEmbeddedSignup] sessionInfo not received — proceeding without it (mobile fallback)');
    }

    const result = await embeddedSignup({
      code,
      ...(sessionInfo ? { waba_id: sessionInfo.waba_id, phone_number_id: sessionInfo.phone_number_id } : {}),
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
    flowActiveRef.current = true;

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
