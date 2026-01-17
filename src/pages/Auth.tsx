import { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Droplets, Mail, Lock, User, Loader2, ArrowRight, X, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import heroBackground from '@/assets/hero-background.png';

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle query params for prefilled email and mode
  useEffect(() => {
    const mode = searchParams.get('mode');
    const prefillEmail = searchParams.get('email') || searchParams.get('prefill');
    const invited = searchParams.get('invited');

    if (mode === 'forgot') {
      setAuthMode('forgot');
      setShowAuthModal(true);
      if (prefillEmail) {
        setEmail(prefillEmail);
      }
      // Clean up the URL
      setSearchParams({});
    } else if (prefillEmail || invited) {
      // Handle invitation link
      setAuthMode('signup');
      setShowAuthModal(true);
      if (prefillEmail) {
        setEmail(prefillEmail);
      }
      // Clean up the URL
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Redirect if already logged in
  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (authMode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: "https://waterops.com.au/reset-password",
        });
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Password reset email sent! Check your inbox.');
          setAuthMode('signin');
        }
      } else if (authMode === 'signup') {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Account created successfully! You can now sign in.');
          setAuthMode('signin');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openLogin = () => {
    setAuthMode('signin');
    setShowAuthModal(true);
  };

  const openSignUp = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Hero Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <Droplets className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Water Ops</span>
          </div>
        </header>

        {/* Main Hero Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
          <div className="max-w-3xl text-center">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Wastewater Process
              <br />
              <span className="text-primary">Monitoring</span> Made Simple
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Track readings, manage alerts, and keep your treatment plant running smoothly with real-time monitoring and intelligent automation.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={openSignUp}
                className="group flex items-center gap-3 px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
              >
                Get Started
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={openLogin}
                className="flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl font-semibold text-lg transition-all duration-300"
              >
                Sign In
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-white">6</p>
              <p className="text-sm text-white/60 mt-1">Key Metrics</p>
            </div>
            <div className="w-px h-12 bg-white/20 hidden md:block" />
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-white">24/7</p>
              <p className="text-sm text-white/60 mt-1">Monitoring</p>
            </div>
            <div className="w-px h-12 bg-white/20 hidden md:block" />
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-white">Live</p>
              <p className="text-sm text-white/60 mt-1">Alerts</p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center">
          <p className="text-sm text-white/50">
            © {new Date().getFullYear()} Water Ops. Modern wastewater management.
          </p>
        </footer>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAuthModal(false)}
          />
          
          {/* Modal */}
          <div className="relative w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl animate-fade-in">
            {/* Close button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8">
              {/* Back button for forgot password */}
              {authMode === 'forgot' && (
                <button
                  onClick={() => setAuthMode('signin')}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </button>
              )}

              {/* Logo */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Droplets className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xl font-bold text-foreground">Water Ops</span>
              </div>

              <h2 className="text-2xl font-bold text-foreground text-center mb-2">
                {authMode === 'signup' && 'Create Account'}
                {authMode === 'signin' && 'Welcome Back'}
                {authMode === 'forgot' && 'Reset Password'}
              </h2>
              <p className="text-muted-foreground text-center mb-6">
                {authMode === 'signup' && 'Sign up to start monitoring your plant'}
                {authMode === 'signin' && 'Sign in to access your dashboard'}
                {authMode === 'forgot' && "Enter your email and we'll send you a reset link"}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Display Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="John Operator"
                        className="input-field pl-11"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@plant.com"
                      className="input-field pl-11"
                      required
                    />
                  </div>
                </div>

                {authMode !== 'forgot' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="input-field pl-11"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                )}

                {authMode === 'signin' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setAuthMode('forgot')}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {authMode === 'signup' && 'Creating Account...'}
                      {authMode === 'signin' && 'Signing In...'}
                      {authMode === 'forgot' && 'Sending Email...'}
                    </>
                  ) : (
                    <>
                      {authMode === 'signup' && 'Create Account'}
                      {authMode === 'signin' && 'Sign In'}
                      {authMode === 'forgot' && 'Send Reset Link'}
                    </>
                  )}
                </button>
              </form>

              {authMode !== 'forgot' && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {authMode === 'signup'
                      ? 'Already have an account? Sign in'
                      : "Don't have an account? Sign up"}
                  </button>
                </div>
              )}
            </div>

            {authMode === 'signup' && (
              <div className="px-8 pb-6">
                <p className="text-xs text-center text-muted-foreground">
                  New accounts are assigned the Operator role by default.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
