import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Droplets, Mail, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

type ConfirmationStatus = 'loading' | 'success' | 'error' | 'already-confirmed';

export default function EmailConfirmation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<ConfirmationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const confirmEmail = async () => {
      try {
        // Check for PKCE flow: ?code=...
        const code = searchParams.get('code');
        const type = searchParams.get('type');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            // Check if it's an already-used token error
            if (error.message.includes('already') || error.message.includes('expired')) {
              if (isMounted) setStatus('already-confirmed');
              return;
            }
            throw error;
          }
          
          if (isMounted) {
            setStatus('success');
            toast.success('Email confirmed successfully!');
            setTimeout(() => navigate('/'), 2000);
          }
          return;
        }

        // Check for implicit flow: #access_token=...&type=signup
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const hashType = hashParams.get('type');

        if (accessToken && refreshToken && (hashType === 'signup' || hashType === 'email')) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;

          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);

          if (isMounted) {
            setStatus('success');
            toast.success('Email confirmed successfully!');
            setTimeout(() => navigate('/'), 2000);
          }
          return;
        }

        // Check if user is already logged in (clicked link while logged in)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (isMounted) {
            setStatus('already-confirmed');
          }
          return;
        }

        // No valid tokens found
        if (isMounted) {
          setStatus('error');
          setErrorMessage('Invalid or missing confirmation link. Please try signing up again.');
        }
      } catch (err: any) {
        console.error('Email confirmation error:', err);
        if (isMounted) {
          setStatus('error');
          setErrorMessage(err.message || 'Failed to confirm email. Please try again.');
        }
      }
    };

    confirmEmail();

    return () => {
      isMounted = false;
    };
  }, [searchParams, navigate]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Confirming your email...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Email Confirmed!</h1>
          <p className="text-muted-foreground">
            Your email has been verified successfully. Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'already-confirmed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-lg p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Droplets className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-bold text-foreground">WaterOps</span>
          </div>
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Already Confirmed</h1>
          <p className="text-muted-foreground mb-6">
            Your email has already been confirmed. You can now sign in to your account.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/')}
              className="btn-primary w-full py-3"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="w-full py-3 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-lg p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Droplets className="w-6 h-6 text-primary" />
          </div>
          <span className="text-xl font-bold text-foreground">WaterOps</span>
        </div>
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Confirmation Failed</h1>
        <p className="text-muted-foreground mb-6">
          {errorMessage}
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/auth?mode=signup')}
            className="btn-primary w-full py-3"
          >
            Try Signing Up Again
          </button>
          <button
            onClick={() => navigate('/auth')}
            className="w-full py-3 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}