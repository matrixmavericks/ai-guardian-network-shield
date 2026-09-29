import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { friendlyFirstName } from '@/lib/studentIds';
import { lovable } from '@/integrations/lovable/index';
import { Wordmark } from "@/components/landing/LandingNav";
import AuthBrandPanel from "@/components/landing/AuthBrandPanel";
import { GlowSubmit } from "@/components/landing/primitives";

const inputClass =
  "h-12 w-full rounded-xl border border-lp-line bg-lp-surface/70 pl-11 pr-4 text-[15px] text-lp-text placeholder:text-lp-mute outline-none transition-[border-color,background-color,box-shadow] duration-200 focus:border-lp-blue/70 focus:bg-lp-surface focus:shadow-[0_0_0_4px_rgba(59,130,246,0.15)]";

const GoogleIcon = () => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
);

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, login, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      navigateByRole(user.role);
    }
  }, [user]);

  const navigateByRole = (role: string) => {
    if (role === 'admin') navigate("/dashboard");
    else if (role === 'teacher') navigate("/dashboard");
    else if (role === 'student') navigate("/student-dashboard");
    else if (role === 'parent') navigate("/parent-dashboard");
    else navigate("/dashboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const loggedInUser = await login(email, password);
      toast({
        title: "Login successful",
        description: `Welcome back${friendlyFirstName(loggedInUser.fullName, "") ? `, ${friendlyFirstName(loggedInUser.fullName, "")}` : ""}!`,
      });
      navigateByRole(loggedInUser.role);
    } catch (err: unknown) {
      const message = (err as { message?: string } | null)?.message || "Invalid email or password.";
      setError(message);

    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      setError(error.message || "Google sign-in failed.");
      setGoogleLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="relative z-[1] flex h-screen items-center justify-center bg-lp-bg font-ui text-white">
        <Wordmark className="animate-pulse text-[32px]" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  return (
    <div className="relative z-[1] grid min-h-screen grid-cols-1 bg-lp-bg font-ui text-lp-text antialiased selection:bg-lp-blue/40 selection:text-white lg:grid-cols-2">
      <AuthBrandPanel />

      <main className="relative flex min-h-screen flex-col overflow-hidden px-5 py-6 sm:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 top-10 h-[480px] w-[480px] rounded-full opacity-40 blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.45), transparent 65%)" }}
        />

        <header className="relative flex items-center justify-between">
          <Link to="/" aria-label="Refyn home" className="text-white lg:invisible">
            <Wordmark />
          </Link>
          <p className="text-[14px] text-lp-soft">
            New to Refyn?{" "}
            <Link to="/register" className="font-medium text-white underline decoration-lp-blue/60 underline-offset-4 transition-colors hover:text-lp-sky">
              Sign up
            </Link>
          </p>
        </header>

        <div className="relative mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">
          <div className="lp-fade">
            <h1 className="text-[40px] font-normal leading-[1] tracking-[-0.045em] text-white sm:text-[48px]">Welcome back</h1>
            <p className="mt-3 text-[16px] text-lp-soft">Log in to your Refyn account.</p>
          </div>

          <div className="lp-fade mt-9" style={{ animationDelay: "80ms", animationFillMode: "both" }}>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/[0.06] text-[15px] font-medium text-white transition-all duration-200 hover:border-white/30 hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-sky disabled:cursor-wait disabled:opacity-70"
            >
              {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
              Continue with Google
            </button>

            <div className="my-7 flex items-center gap-4 text-[12px] uppercase tracking-[0.18em] text-lp-mute">
              <span className="h-px flex-1 bg-lp-line" />
              or with email
              <span className="h-px flex-1 bg-lp-line" />
            </div>
          </div>

          {error && (
            <div role="alert" className="lp-fade mb-5 flex items-start gap-3 rounded-xl border border-lp-red/30 bg-lp-red/10 px-4 py-3 text-[14px] text-[#FFB4AE]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-lp-red" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="lp-fade space-y-5" style={{ animationDelay: "160ms", animationFillMode: "both" }}>
            <div>
              <label htmlFor="email" className="mb-2 block text-[13.5px] font-medium text-lp-soft">
                Email or student ID
              </label>
              <div className="relative">
                <Mail aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-lp-mute" />
                <input
                  id="email"
                  type="text"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu or MIS-XXXXXXXX"
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-[13.5px] font-medium text-lp-soft">
                Password
              </label>
              <div className="relative">
                <Lock aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-lp-mute" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-lp-mute transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <GlowSubmit type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Logging in…
                  </>
                ) : (
                  <>
                    Log in <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </GlowSubmit>
            </div>
          </form>

          <div className="lp-fade mt-8 flex gap-3 rounded-2xl border border-lp-line bg-lp-surface/50 p-4" style={{ animationDelay: "240ms", animationFillMode: "both" }}>
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-lp-blue/15 text-lp-sky">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <p className="text-[13px] leading-relaxed text-lp-soft">
              <span className="font-medium text-lp-text">Pilot students:</span> sign in with the temporary password you
              were given, or with Google using the same school email. Both open the same account.
            </p>
          </div>
        </div>

        <footer className="relative text-center text-[12.5px] text-lp-mute">
          By logging in, you agree to our{" "}
          <Link to="/legal/terms" className="text-lp-soft underline decoration-lp-line underline-offset-4 hover:text-white">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/legal/privacy" className="text-lp-soft underline decoration-lp-line underline-offset-4 hover:text-white">
            Privacy Policy
          </Link>
          .
        </footer>
      </main>
    </div>
  );
};

export default Login;
