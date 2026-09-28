import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, Search, ShieldQuestion, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import AuthBrandPanel from "@/components/landing/AuthBrandPanel";
import { Wordmark } from "@/components/landing/LandingNav";
import { GlowSubmit } from "@/components/landing/primitives";

const inputClass =
  "h-12 w-full rounded-xl border border-lp-line bg-lp-surface/70 pl-11 pr-12 text-[15px] text-lp-text placeholder:text-lp-mute outline-none transition-[border-color,background-color,box-shadow] duration-200 focus:border-lp-blue/70 focus:bg-lp-surface focus:shadow-[0_0_0_4px_rgba(59,130,246,0.15)]";

const fadeIn = (delay: number) => ({ animationDelay: `${delay}ms`, animationFillMode: "both" as const });

const ROLE_LABELS: Record<string, string> = {
  admin: "School administrator",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
};

/** Rough strength, for the meter only; the real minimum is still 6 characters. */
const passwordStrength = (pw: string) => {
  if (!pw) return 0;
  let score = pw.length >= 6 ? 1 : 0;
  if (pw.length >= 10) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.max(score, 1);
};
const STRENGTH = [
  { label: "", color: "" },
  { label: "Weak", color: "bg-lp-red" },
  { label: "Fair", color: "bg-[#FBBF24]" },
  { label: "Good", color: "bg-lp-sky" },
  { label: "Strong", color: "bg-lp-green" },
];

const PasswordField: React.FC<{
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  children?: React.ReactNode;
}> = ({ id, label, value, placeholder, onChange, children }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13.5px] font-medium text-lp-soft">
        {label}
      </label>
      <div className="relative">
        <Lock aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-lp-mute" />
        <input
          id={id}
          name={id}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-lp-mute transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {children}
    </div>
  );
};

const Signup = () => {
  const [searchParams] = useSearchParams();
  const prefilledEmail = searchParams.get('email') || '';
  const [formData, setFormData] = useState({
    email: prefilledEmail, password: "", confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvedRequest, setApprovedRequest] = useState<{ full_name: string; requested_role: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signUp } = useAuth();

  useEffect(() => {
    if (formData.email) {
      checkApproval(formData.email);
    } else {
      setChecking(false);
    }
  }, []);

  const checkApproval = async (email: string) => {
    setChecking(true);
    const { data } = await supabase
      .from('registration_requests')
      .select('full_name, requested_role, status')
      .eq('email', email.trim().toLowerCase())
      .eq('status', 'approved')
      .limit(1);

    if (data && data.length > 0) {
      setApprovedRequest({ full_name: data[0].full_name, requested_role: data[0].requested_role });
    } else {
      setApprovedRequest(null);
    }
    setChecking(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvedRequest) {
      toast({ title: "Not approved", description: "Your registration request hasn't been approved yet.", variant: "destructive" });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure your passwords match.", variant: "destructive" });
      return;
    }
    if (formData.password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp(formData.email.trim(), formData.password, approvedRequest.full_name, approvedRequest.requested_role);

      // Mark the request as completed (keep payment_plan and seat_config for provisioning on first login)
      await supabase
        .from('registration_requests')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ status: 'completed' } as any)
        .eq('email', formData.email.trim().toLowerCase())
        .eq('status', 'approved');

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account, then log in.",
      });
      navigate("/login");
    } catch (error: unknown) {
      toast({
        title: "Registration failed",
        description: (error as { message?: string } | null)?.message || "We couldn't create your account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="relative z-[1] flex h-screen flex-col items-center justify-center gap-4 bg-lp-bg font-ui text-white">
        <Wordmark className="animate-pulse text-[32px]" />
        <p className="flex items-center gap-2 text-[14px] text-lp-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking your approval…
        </p>
      </div>
    );
  }

  const strength = passwordStrength(formData.password);
  const confirmTouched = formData.confirmPassword.length > 0;
  const matches = confirmTouched && formData.password === formData.confirmPassword;
  const firstName = approvedRequest?.full_name.split(" ")[0];

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
          <Link to="/" aria-label="Refyn home" className="text-white lg:hidden">
            <Wordmark />
          </Link>
          <Link to="/register" className="hidden items-center gap-1.5 text-[14px] text-lp-soft transition-colors hover:text-white lg:flex">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <p className="text-[14px] text-lp-soft">
            <span className="hidden sm:inline">Already have an account? </span>
            <Link to="/login" className="font-medium text-white underline decoration-lp-blue/60 underline-offset-4 transition-colors hover:text-lp-sky">
              Log in
            </Link>
          </p>
        </header>

        <div className="relative mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">
          {!approvedRequest ? (
            <>
              <div className="lp-fade">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#FBBF24]/40 bg-[#FBBF24]/10 text-[#FBBF24] shadow-[0_0_40px_-8px_rgba(251,191,36,0.5)]">
                  <ShieldQuestion className="h-6 w-6" />
                </span>
                <h1 className="mt-6 text-[36px] font-normal leading-[1] tracking-[-0.045em] text-white sm:text-[42px]">
                  No approved request yet
                </h1>
                <p className="mt-4 text-[15.5px] leading-relaxed text-lp-soft">
                  We couldn't find an approved registration request for this email. Submit a request first and wait for an
                  administrator to approve it.
                </p>
              </div>

              <div className="lp-fade mt-8 space-y-4" style={fadeIn(80)}>
                <div>
                  <label htmlFor="check-email" className="mb-2 block text-[13.5px] font-medium text-lp-soft">
                    Check another email
                  </label>
                  <div className="relative">
                    <Mail aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-lp-mute" />
                    <input
                      id="check-email"
                      type="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="you@school.edu"
                      className={cn(inputClass, "pr-4")}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => checkApproval(formData.email)}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] text-[15px] font-medium text-white transition-all hover:border-white/30 hover:bg-white/[0.1]"
                >
                  <Search className="h-4 w-4" /> Check approval status
                </button>
              </div>

              <div className="lp-fade mt-8 rounded-2xl border border-lp-line bg-lp-surface/50 p-5" style={fadeIn(160)}>
                <p className="text-[14.5px] font-medium text-white">Haven't requested access yet?</p>
                <p className="mt-1 text-[13.5px] text-lp-soft">It takes a minute: tell us who you are and pick a plan.</p>
                <Link to="/register" className="mt-4 inline-flex items-center gap-1.5 text-[14.5px] font-medium text-lp-sky transition-colors hover:text-white">
                  Submit a registration request <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="lp-fade">
                <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-lp-mute">Last step · 4 of 4</p>
                <h1 className="mt-3 text-[40px] font-normal leading-[1] tracking-[-0.045em] text-white sm:text-[48px]">
                  {firstName ? `Welcome, ${firstName}` : "Create your account"}
                </h1>
                <p className="mt-3 text-[16px] text-lp-soft">Your request was approved. Set a password to finish setting up.</p>
              </div>

              <div
                className="lp-fade mt-8 flex items-center gap-3 rounded-2xl border border-lp-green/30 bg-lp-green/[0.08] p-4"
                style={fadeIn(80)}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lp-green/15 text-lp-green">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[14.5px] font-medium text-white">
                    Approved as {ROLE_LABELS[approvedRequest.requested_role] ?? approvedRequest.requested_role}
                  </p>
                  <p className="truncate text-[13px] text-lp-soft">{approvedRequest.full_name}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="lp-fade mt-7 space-y-5" style={fadeIn(160)}>
                <div>
                  <label htmlFor="email" className="mb-2 block text-[13.5px] font-medium text-lp-soft">
                    Email
                  </label>
                  <div className="relative">
                    <Mail aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-lp-mute" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      value={formData.email}
                      readOnly
                      aria-readonly
                      className={cn(inputClass, "cursor-not-allowed text-lp-soft focus:shadow-none")}
                    />
                    <Lock aria-hidden className="pointer-events-none absolute right-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-lp-mute" />
                  </div>
                </div>

                <PasswordField
                  id="password"
                  label="Password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                >
                  {formData.password && (
                    <div className="mt-2.5 flex items-center gap-3" aria-live="polite">
                      <div className="flex flex-1 gap-1.5">
                        {[1, 2, 3, 4].map((i) => (
                          <span
                            key={i}
                            className={cn(
                              "h-1 flex-1 rounded-full transition-colors duration-300",
                              i <= strength ? STRENGTH[strength].color : "bg-lp-line",
                            )}
                          />
                        ))}
                      </div>
                      <span className="w-12 text-right text-[12px] text-lp-soft">
                        {formData.password.length < 6 ? "Too short" : STRENGTH[strength].label}
                      </span>
                    </div>
                  )}
                </PasswordField>

                <PasswordField
                  id="confirmPassword"
                  label="Confirm password"
                  placeholder="Type it again"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                >
                  {confirmTouched && (
                    <p
                      className={cn("mt-2 flex items-center gap-1.5 text-[12.5px]", matches ? "text-lp-green" : "text-lp-red")}
                      aria-live="polite"
                    >
                      {matches ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      {matches ? "Passwords match" : "Passwords don't match yet"}
                    </p>
                  )}
                </PasswordField>

                <div className="pt-2">
                  <GlowSubmit type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
                      </>
                    ) : (
                      <>
                        Create account <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </GlowSubmit>
                </div>
                <p className="text-center text-[13px] text-lp-mute">
                  We'll email you a link to verify your address, then you can log in.
                </p>
              </form>
            </>
          )}
        </div>

        <footer className="relative text-center text-[12.5px] text-lp-mute">
          By creating an account, you agree to our{" "}
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

export default Signup;
