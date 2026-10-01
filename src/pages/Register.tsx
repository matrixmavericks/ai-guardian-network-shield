import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Crown,
  GraduationCap,
  Loader2,
  Mail,
  Percent,
  School,
  Search,
  Sparkles,
  User,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { STUDENT_PLANS, TEACHER_PLANS, ADMIN_PLANS, calcAdminMonthlyCost } from "@/lib/planConfigs";
import { usePaymentsEnabled } from "@/hooks/usePlatformSettings";
import { z } from "zod";
import { Wordmark } from "@/components/landing/LandingNav";
import { GlowSubmit } from "@/components/landing/primitives";
import { consentNext } from "@/lib/oauthReturn";

// Input validation schema (security: prevent injection / oversized inputs)
const registrationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().trim().toLowerCase().email("Invalid email address").max(255),
  requested_role: z.enum(["student", "teacher", "admin", "parent"]),
});

// ─── Plan card data ───
type PlanCardMeta = { id: string; icon: React.ElementType; badge?: string };

const STUDENT_PLAN_CARDS: PlanCardMeta[] = [
  { id: "starter", icon: Sparkles },
  { id: "standard", icon: Zap, badge: "Most popular" },
  { id: "premium", icon: Crown },
];

const TEACHER_PLAN_CARDS: PlanCardMeta[] = [
  { id: "teacher_individual", icon: GraduationCap },
  { id: "teacher_pro", icon: Zap, badge: "Best value" },
  { id: "teacher_master", icon: Crown },
];

const ADMIN_PLAN_CARDS: PlanCardMeta[] = [
  { id: "school_starter", icon: School },
  { id: "school_growth", icon: Building2, badge: "Most popular" },
  { id: "school_enterprise", icon: Crown },
];

const ROLES = [
  { id: "student", label: "Student", desc: "Learning with Refyn", icon: GraduationCap },
  { id: "teacher", label: "Teacher", desc: "Running my own class", icon: BookOpen },
  { id: "admin", label: "School administrator", desc: "Setting up a school", icon: School },
];

const inputClass =
  "h-12 w-full rounded-xl border border-lp-line bg-lp-surface/70 pl-11 pr-4 text-[15px] text-lp-text placeholder:text-lp-mute outline-none transition-[border-color,background-color,box-shadow] duration-200 focus:border-lp-blue/70 focus:bg-lp-surface focus:shadow-[0_0_0_4px_rgba(59,130,246,0.15)]";

const fadeIn = (delay: number) => ({ animationDelay: `${delay}ms`, animationFillMode: "both" as const });

/* ---------- Small building blocks ---------- */

const SectionHead: React.FC<{ n: number; title: string; desc?: string; right?: React.ReactNode }> = ({ n, title, desc, right }) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-lp-blue/50 bg-lp-blue/15 text-[13px] font-semibold text-lp-sky">
        {n}
      </span>
      <div>
        <h2 className="text-[20px] font-medium tracking-[-0.02em] text-white">{title}</h2>
        {desc && <p className="mt-1 text-[14px] text-lp-soft">{desc}</p>}
      </div>
    </div>
    {right}
  </div>
);

const PlanCard: React.FC<{
  meta: PlanCardMeta;
  name: string;
  price: number;
  priceNote?: React.ReactNode;
  features: string[];
  selected: boolean;
  onSelect: () => void;
  children?: React.ReactNode;
}> = ({ meta, name, price, priceNote, features, selected, onSelect, children }) => {
  const Icon = meta.icon;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex h-full flex-col rounded-2xl border p-5 text-left transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-sky",
        selected
          ? "border-lp-blue/70 bg-gradient-to-b from-lp-blue/15 to-lp-surface shadow-[0_0_0_1px_rgba(59,130,246,0.45),0_24px_60px_-24px_rgba(59,130,246,0.6)]"
          : "border-lp-line bg-lp-surface/50 hover:-translate-y-0.5 hover:border-white/20",
      )}
    >
      {meta.badge && (
        <span className="absolute -top-3 left-5 rounded-full bg-lp-blue px-2.5 py-0.5 text-[11px] font-medium text-white shadow-[0_6px_20px_-6px_rgba(59,130,246,0.8)]">
          {meta.badge}
        </span>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
              selected ? "bg-lp-blue text-white" : "bg-lp-raised text-lp-sky",
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <span className="text-[15px] font-medium text-white">{name}</span>
        </span>
        <span
          aria-hidden
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
            selected ? "border-lp-blue bg-lp-blue text-white" : "border-lp-line",
          )}
        >
          {selected && <Check className="h-3 w-3" />}
        </span>
      </div>
      <div className="mt-5">
        <span className="text-[32px] font-semibold tracking-[-0.03em] text-white">₹{price.toLocaleString("en-IN")}</span>
        <span className="text-[14px] text-lp-mute">/mo</span>
        {priceNote && <div className="mt-1 text-[12px] leading-relaxed text-lp-mute">{priceNote}</div>}
      </div>
      <ul className="mt-5 space-y-2 border-t border-lp-line pt-4">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] leading-snug text-lp-soft">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lp-green" />
            {f}
          </li>
        ))}
      </ul>
      {children}
    </button>
  );
};

const SeatSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  ticks: string[];
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, ticks, onChange }) => {
  const id = `seats-${label.toLowerCase()}`;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <label htmlFor={id} className="text-[13.5px] font-medium text-lp-soft">
          {label}
        </label>
        <span className="rounded-lg border border-lp-blue/40 bg-lp-blue/15 px-2.5 py-0.5 text-[13px] font-semibold tabular-nums text-white">
          {value.toLocaleString("en-IN")}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="lp-range"
        style={{ ["--fill" as string]: `${((value - min) / (max - min)) * 100}%` }}
      />
      <div className="mt-2 flex justify-between text-[11px] text-lp-mute">
        {ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  );
};

const StatusCard: React.FC<{
  tone: "amber" | "green" | "red";
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}> = ({ tone, icon: Icon, title, children }) => (
  <div className="lp-fade mx-auto w-full max-w-[520px] rounded-3xl border border-lp-line bg-gradient-to-b from-lp-surface to-lp-bg/60 p-8 text-center sm:p-10">
    <span
      className={cn(
        "mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border",
        tone === "amber" && "border-[#FBBF24]/40 bg-[#FBBF24]/10 text-[#FBBF24] shadow-[0_0_40px_-8px_rgba(251,191,36,0.5)]",
        tone === "green" && "border-lp-green/40 bg-lp-green/10 text-lp-green shadow-[0_0_40px_-8px_rgba(52,211,153,0.5)]",
        tone === "red" && "border-lp-red/40 bg-lp-red/10 text-lp-red shadow-[0_0_40px_-8px_rgba(242,112,106,0.5)]",
      )}
    >
      <Icon className="h-7 w-7" />
    </span>
    <h2 className="mt-6 text-[28px] font-normal tracking-[-0.035em] text-white">{title}</h2>
    <div className="mt-3 space-y-5 text-[15px] leading-relaxed text-lp-soft">{children}</div>
  </div>
);

const secondaryBtn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-5 text-[14.5px] font-medium text-white transition-all hover:border-white/30 hover:bg-white/[0.1] disabled:cursor-wait disabled:opacity-70";

/* ---------- Page ---------- */

const Register = () => {
  const [formData, setFormData] = useState({ name: "", email: "", requested_role: "student" });
  const [selectedPlan, setSelectedPlan] = useState<string>("standard");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [studentCount, setStudentCount] = useState<number>(100);
  const [teacherCount, setTeacherCount] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'submitted' | 'checking' | 'approved' | 'rejected' | 'pending'>('idle');
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const next = consentNext(useLocation().search);
  const { paymentsEnabled } = usePaymentsEnabled();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (role: string) => {
    setFormData(prev => ({ ...prev, requested_role: role }));
    if (role === 'student') setSelectedPlan('standard');
    else if (role === 'teacher') setSelectedPlan('teacher_pro');
    else setSelectedPlan('school_growth');
  };

  const checkExistingRequest = async (email: string) => {
    // Use SECURITY DEFINER RPC so we don't need broad SELECT on registration_requests
    const { data, error } = await supabase
      .rpc('get_registration_status_by_email', { _email: email.trim().toLowerCase() });
    if (error || !data || data.length === 0) return null;
    return data[0];
  };

  const handleCheckStatus = async () => {
    if (!formData.email) {
      toast({ title: "Enter your email", description: "Please enter your email to check request status.", variant: "destructive" });
      return;
    }
    setRequestStatus('checking');
    const existing = await checkExistingRequest(formData.email);
    if (!existing) {
      setRequestStatus('idle');
      toast({ title: "No request found", description: "No registration request found for this email.", variant: "destructive" });
    } else if (existing.status === 'approved') {
      setRequestStatus('approved');
    } else if (existing.status === 'rejected') {
      setRequestStatus('rejected');
      setRejectionReason(existing.rejection_reason || "No reason provided.");
    } else {
      setRequestStatus('pending');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs (security: prevent oversized/malformed data)
    const parsed = registrationSchema.safeParse(formData);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid form data";
      toast({ title: "Validation error", description: firstError, variant: "destructive" });
      return;
    }
    const validated = parsed.data;

    setIsSubmitting(true);
    try {
      const existing = await checkExistingRequest(validated.email);
      if (existing?.status === 'pending') {
        setRequestStatus('pending');
        toast({ title: "Request already pending", description: "You already have a pending registration request." });
        return;
      }
      if (existing?.status === 'approved') {
        setRequestStatus('approved');
        toast({ title: "Already approved!", description: "Your request was approved. You can now create your account." });
        return;
      }

      const paymentPlanValue = `${selectedPlan}_${billingCycle}`;
      const seatConfig = validated.requested_role === 'admin' ? { teachers: teacherCount, students: studentCount } : null;

      const { data: inserted, error } = await supabase.from('registration_requests').insert({
        full_name: validated.name,
        email: validated.email,
        requested_role: validated.requested_role,
        status: 'pending',
        payment_plan: paymentPlanValue,
        seat_config: seatConfig,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any).select('id').single();

      if (error) {
        if (error.code === '23505') {
          setRequestStatus('pending');
          toast({ title: "Request already pending", description: "You already have a pending registration request." });
          return;
        }
        throw error;
      }

      if (paymentsEnabled) {
        toast({ title: "Request submitted!", description: "Redirecting to secure payment..." });
        navigate(`/pay/${inserted.id}`);
      } else {
        setRequestStatus('submitted');
        toast({ title: "Request submitted!", description: "An administrator will review and approve your account." });
      }
      return;
    } catch (error: unknown) {
      const message = (error as { message?: string } | null)?.message;
      toast({ title: "Submission failed", description: message || "Could not submit your request.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin cost calc using centralized helper
  const adminCost = calcAdminMonthlyCost(selectedPlan, teacherCount, studentCount, billingCycle === 'yearly');

  const role = formData.requested_role;
  const showPlans = requestStatus === 'idle' || requestStatus === 'checking';

  const perMonth = (monthly: number, yearly: number) => (billingCycle === "monthly" ? monthly : Math.round(yearly / 12));

  // One-line summary of the current choice, shown next to the submit button
  const summary = (() => {
    if (role === "student" && STUDENT_PLANS[selectedPlan]) {
      const p = STUDENT_PLANS[selectedPlan];
      return { name: p.name, price: perMonth(p.monthlyPrice, p.yearlyPrice) };
    }
    if (role === "teacher" && TEACHER_PLANS[selectedPlan]) {
      const p = TEACHER_PLANS[selectedPlan];
      return { name: p.name, price: perMonth(p.monthlyPrice, p.yearlyPrice) };
    }
    if (role === "admin" && ADMIN_PLANS[selectedPlan]) {
      return { name: `School ${ADMIN_PLANS[selectedPlan].name}`, price: adminCost.total };
    }
    return null;
  })();

  const steps = [
    "Tell us about you",
    "Choose a plan",
    paymentsEnabled ? "Pay securely" : "We review your request",
    "Create your account",
  ];

  const renderStatusCard = () => {
    if (requestStatus === 'submitted' || requestStatus === 'pending') {
      return (
        <StatusCard tone="amber" icon={Clock} title="Request received">
          <p>
            Your registration request has been submitted. An administrator will contact you with payment details and
            approve your account.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" className={secondaryBtn} onClick={() => setRequestStatus('idle')}>
              Submit another request
            </button>
            <Link to="/" className={secondaryBtn}>
              Back to home
            </Link>
          </div>
        </StatusCard>
      );
    }
    if (requestStatus === 'approved') {
      return (
        <StatusCard tone="green" icon={CheckCircle2} title="You're approved">
          <p>Your registration has been approved. You can now create your account.</p>
          <div className="mx-auto max-w-[280px]">
            <GlowSubmit type="button" onClick={() => navigate(`/signup?email=${encodeURIComponent(formData.email)}${next ? `&next=${encodeURIComponent(next)}` : ""}`)}>
              Create your account <ArrowRight className="h-4 w-4" />
            </GlowSubmit>
          </div>
        </StatusCard>
      );
    }
    if (requestStatus === 'rejected') {
      return (
        <StatusCard tone="red" icon={XCircle} title="Request not approved">
          <p>Your registration request was not approved.</p>
          {rejectionReason && (
            <p className="rounded-xl border border-lp-red/30 bg-lp-red/10 px-4 py-3 text-left text-[14px] text-[#FFB4AE]">
              <span className="font-medium text-lp-red">Reason:</span> {rejectionReason}
            </p>
          )}
          <button type="button" className={secondaryBtn} onClick={() => setRequestStatus('idle')}>
            Submit a new request
          </button>
        </StatusCard>
      );
    }
    return null;
  };

  return (
    <div className="relative z-[1] min-h-screen overflow-x-clip bg-lp-bg font-ui text-lp-text antialiased selection:bg-lp-blue/40 selection:text-white">
      {/* Ambient glow + dot field */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[1000px] -translate-x-1/2 rounded-full opacity-50 blur-[130px]"
        style={{ background: "radial-gradient(closest-side, rgba(59,130,246,0.45), transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[640px] opacity-50"
        style={{
          backgroundImage: "radial-gradient(rgba(124,180,255,0.12) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 60% 70% at 50% 0%, #000 20%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 70% at 50% 0%, #000 20%, transparent 75%)",
        }}
      />

      <header className="relative mx-auto flex max-w-[1200px] items-center justify-between px-5 py-5 sm:px-8 sm:py-6">
        <Link to="/" aria-label="Refyn home" className="text-white">
          <Wordmark />
        </Link>
        <p className="text-[14px] text-lp-soft">
          <span className="hidden sm:inline">Already have an account? </span>
          <Link to={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-medium text-white underline decoration-lp-blue/60 underline-offset-4 transition-colors hover:text-lp-sky">
            Log in
          </Link>
        </p>
      </header>

      <main className="relative mx-auto max-w-[1040px] px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        {showPlans && (
          <>
            <div className="lp-fade text-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-lp-line bg-lp-surface/60 px-3 py-1 text-[12px] font-medium text-lp-soft">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-lp-sky shadow-[0_0_10px_2px_rgba(124,180,255,0.6)]" />
                Request access
              </p>
              <h1 className="mx-auto mt-6 max-w-[16ch] text-balance text-[42px] font-normal leading-[0.98] tracking-[-0.045em] text-white sm:text-[60px]">
                Bring Refyn to your{" "}
                <span className="bg-gradient-to-r from-lp-sky via-[#A5CCFF] to-lp-cyan bg-clip-text text-transparent">classroom.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-[34rem] text-balance text-[17px] leading-[1.6] text-lp-soft">
                Tell us who you are and choose a plan. An administrator reviews every request before an account is created.
              </p>
            </div>

            {/* How it works, at a glance */}
            <ol className="lp-fade mx-auto mt-10 flex max-w-[860px] flex-col gap-2 sm:flex-row sm:items-center sm:gap-0" style={fadeIn(80)}>
              {steps.map((s, i) => (
                <React.Fragment key={s}>
                  <li className="flex items-center gap-2.5 rounded-full border border-lp-line bg-lp-surface/60 py-1.5 pl-1.5 pr-4 text-[13px] text-lp-soft sm:shrink-0">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold",
                        i < 2 ? "bg-lp-blue text-white" : "bg-lp-raised text-lp-sky",
                      )}
                    >
                      {i + 1}
                    </span>
                    {s}
                  </li>
                  {i < steps.length - 1 && (
                    <span
                      aria-hidden
                      className="lp-flow-x mx-2 hidden h-px min-w-[16px] flex-1 bg-gradient-to-r from-lp-line via-lp-blue/60 to-lp-line sm:block"
                      style={{ ["--flow-delay" as string]: `${i * 0.4}s` }}
                    />
                  )}
                </React.Fragment>
              ))}
            </ol>
          </>
        )}

        <div className={cn(showPlans ? "mt-12" : "flex min-h-[60vh] items-center")}>
          {!showPlans ? (
            renderStatusCard()
          ) : (
            <div
              className="lp-fade rounded-3xl border border-lp-line bg-gradient-to-b from-lp-surface to-lp-bg/60 p-5 shadow-[0_40px_120px_-50px_rgba(29,78,216,0.6)] sm:p-10"
              style={fadeIn(160)}
            >
              <form onSubmit={handleSubmit}>
                {/* 1. About you */}
                <SectionHead n={1} title="About you" desc="We'll use your email to set up your account." />
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="mb-2 block text-[13.5px] font-medium text-lp-soft">
                      Full name
                    </label>
                    <div className="relative">
                      <User aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-lp-mute" />
                      <input
                        id="name"
                        name="name"
                        autoComplete="name"
                        placeholder="Aanya Shah"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className={inputClass}
                      />
                    </div>
                  </div>
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
                        autoComplete="email"
                        placeholder="you@school.edu"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                <p id="role-label" className="mb-3 mt-6 text-[13.5px] font-medium text-lp-soft">
                  I am a…
                </p>
                <div role="radiogroup" aria-labelledby="role-label" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {ROLES.map((r) => {
                    const selected = role === r.id;
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => handleRoleChange(r.id)}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-sky",
                          selected
                            ? "border-lp-blue/70 bg-lp-blue/15 shadow-[0_0_0_1px_rgba(59,130,246,0.4)]"
                            : "border-lp-line bg-lp-surface/50 hover:border-white/20",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                            selected ? "bg-lp-blue text-white" : "bg-lp-raised text-lp-sky",
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14.5px] font-medium text-white">{r.label}</span>
                          <span className="block text-[12.5px] text-lp-mute">{r.desc}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="my-10 h-px bg-lp-line" />

                {/* 2. Plan */}
                <SectionHead
                  n={2}
                  title="Choose your plan"
                  desc={role === "admin" ? "Pricing scales with the number of teachers and students." : "You can change plans later."}
                  right={
                    <div role="radiogroup" aria-label="Billing cycle" className="relative flex rounded-full border border-lp-line bg-lp-bg/60 p-1">
                      <span
                        aria-hidden
                        className={cn(
                          "absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full bg-lp-blue shadow-[0_6px_20px_-6px_rgba(59,130,246,0.8)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                          billingCycle === "yearly" ? "translate-x-full" : "translate-x-0",
                        )}
                      />
                      {(["monthly", "yearly"] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          role="radio"
                          aria-checked={billingCycle === c}
                          onClick={() => setBillingCycle(c)}
                          className={cn(
                            "relative z-10 flex w-[124px] items-center justify-center gap-1.5 rounded-full py-1.5 text-[13px] font-medium transition-colors",
                            billingCycle === c ? "text-white" : "text-lp-soft hover:text-white",
                          )}
                        >
                          {c === "monthly" ? "Monthly" : "Yearly"}
                          {c === "yearly" && (
                            <span className="rounded-full bg-lp-green/20 px-1.5 text-[10.5px] font-semibold text-lp-green">−25%</span>
                          )}
                        </button>
                      ))}
                    </div>
                  }
                />

                {/* School seat configurator */}
                {role === 'admin' && (
                  <div className="mt-6 rounded-2xl border border-lp-line bg-lp-bg/50 p-5 sm:p-6">
                    <p className="mb-5 flex items-center gap-2 text-[14px] font-medium text-white">
                      <Users className="h-4 w-4 text-lp-sky" /> Configure your school
                    </p>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
                      <SeatSlider label="Teachers" value={teacherCount} min={1} max={100} step={1} ticks={["1", "25", "50", "100"]} onChange={setTeacherCount} />
                      <SeatSlider
                        label="Students"
                        value={studentCount}
                        min={10}
                        max={3000}
                        step={10}
                        ticks={["10", "500", "1,500", "3,000"]}
                        onChange={setStudentCount}
                      />
                    </div>
                    {(adminCost.teacherDiscount > 0 || adminCost.studentDiscount > 0) && (
                      <div className="lp-fade mt-5 flex flex-wrap gap-2">
                        {adminCost.teacherDiscount > 0 && (
                          <span className="flex items-center gap-1.5 rounded-full border border-lp-green/30 bg-lp-green/10 px-3 py-1 text-[12px] font-medium text-lp-green">
                            <Percent className="h-3 w-3" />
                            {adminCost.teacherDiscount}% teacher discount
                          </span>
                        )}
                        {adminCost.studentDiscount > 0 && (
                          <span className="flex items-center gap-1.5 rounded-full border border-lp-green/30 bg-lp-green/10 px-3 py-1 text-[12px] font-medium text-lp-green">
                            <Percent className="h-3 w-3" />
                            {adminCost.studentDiscount}% student discount
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div key={role} role="radiogroup" aria-label="Plan" className="lp-fade mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
                  {role === 'student' &&
                    STUDENT_PLAN_CARDS.map((card) => {
                      const p = STUDENT_PLANS[card.id];
                      return (
                        <PlanCard
                          key={card.id}
                          meta={card}
                          name={p.name}
                          price={perMonth(p.monthlyPrice, p.yearlyPrice)}
                          priceNote={billingCycle === 'yearly' ? `₹${p.yearlyPrice.toLocaleString("en-IN")} billed yearly` : undefined}
                          features={p.features}
                          selected={selectedPlan === card.id}
                          onSelect={() => setSelectedPlan(card.id)}
                        />
                      );
                    })}

                  {role === 'teacher' &&
                    TEACHER_PLAN_CARDS.map((card) => {
                      const p = TEACHER_PLANS[card.id];
                      return (
                        <PlanCard
                          key={card.id}
                          meta={card}
                          name={p.name}
                          price={perMonth(p.monthlyPrice, p.yearlyPrice)}
                          priceNote={billingCycle === 'yearly' ? `₹${p.yearlyPrice.toLocaleString("en-IN")} billed yearly` : undefined}
                          features={p.features}
                          selected={selectedPlan === card.id}
                          onSelect={() => setSelectedPlan(card.id)}
                        >
                          {p.aiFeatures.length > 0 && (
                            <div className="mt-4 border-t border-lp-line pt-4">
                              <p className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-lp-mute">AI features</p>
                              <div className="flex flex-wrap gap-1.5">
                                {p.aiFeatures.map((af, i) => (
                                  <span key={i} className="rounded-full border border-lp-blue/30 bg-lp-blue/10 px-2 py-0.5 text-[11px] text-lp-sky">
                                    {af}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </PlanCard>
                      );
                    })}

                  {role === 'admin' &&
                    ADMIN_PLAN_CARDS.map((card) => {
                      const p = ADMIN_PLANS[card.id];
                      const cost = calcAdminMonthlyCost(card.id, teacherCount, studentCount, billingCycle === 'yearly');
                      return (
                        <PlanCard
                          key={card.id}
                          meta={card}
                          name={p.name}
                          price={cost.total}
                          priceNote={
                            <span className="block space-y-0.5">
                              <span className="block">Platform: ₹{cost.platform.toLocaleString('en-IN')}</span>
                              <span className="block">
                                {teacherCount} teachers: ₹{cost.teacherCost.toLocaleString('en-IN')}
                                {cost.teacherDiscount > 0 && <span className="font-medium text-lp-green"> (−{cost.teacherDiscount}%)</span>}
                              </span>
                              <span className="block">
                                {studentCount} students: ₹{cost.studentCost.toLocaleString('en-IN')}
                                {cost.studentDiscount > 0 && <span className="font-medium text-lp-green"> (−{cost.studentDiscount}%)</span>}
                              </span>
                            </span>
                          }
                          features={p.features}
                          selected={selectedPlan === card.id}
                          onSelect={() => setSelectedPlan(card.id)}
                        >
                          <div className="mt-4 flex justify-between border-t border-lp-line pt-4 text-[11.5px] text-lp-mute">
                            <span>₹{p.perTeacherMonthly}/teacher</span>
                            <span>₹{p.perStudentMonthly}/student</span>
                          </div>
                        </PlanCard>
                      );
                    })}
                </div>

                {role === 'teacher' && (
                  <p className="mt-5 flex items-start justify-center gap-2 text-center text-[13px] text-lp-mute">
                    <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Teachers get full access to all student-facing features. Want accounts for your whole class? Choose
                    School administrator instead.
                  </p>
                )}

                <div className="my-10 h-px bg-lp-line" />

                {/* Submit */}
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    {summary && (
                      <p className="text-[15px] text-white">
                        {summary.name} · <span className="font-semibold">₹{summary.price.toLocaleString("en-IN")}</span>
                        <span className="text-lp-mute">/mo{billingCycle === "yearly" ? ", billed yearly" : ""}</span>
                      </p>
                    )}
                    <p className="mt-1 max-w-[30rem] text-[13px] leading-relaxed text-lp-mute">
                      {paymentsEnabled
                        ? "Next, you'll be taken to secure payment for your selected plan."
                        : "After your request is approved, the administrator will contact you with payment details for your selected plan."}
                    </p>
                  </div>
                  <div className="md:w-[280px] md:shrink-0">
                    <GlowSubmit type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                        </>
                      ) : (
                        <>
                          {paymentsEnabled ? "Continue to payment" : "Submit request"} <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </GlowSubmit>
                  </div>
                </div>
              </form>

              {/* Check an existing request */}
              <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-lp-line bg-lp-bg/50 p-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[14.5px] font-medium text-white">Already requested access?</p>
                  <p className="mt-0.5 text-[13px] text-lp-mute">Enter your email above and check where your request is.</p>
                </div>
                <button type="button" className={cn(secondaryBtn, "shrink-0")} onClick={handleCheckStatus} disabled={requestStatus === 'checking'}>
                  {requestStatus === 'checking' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {requestStatus === 'checking' ? "Checking…" : "Check request status"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-10 text-center text-[12.5px] text-lp-mute">
          By creating an account, you agree to our{" "}
          <Link to="/legal/terms" className="text-lp-soft underline decoration-lp-line underline-offset-4 hover:text-white">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/legal/privacy" className="text-lp-soft underline decoration-lp-line underline-offset-4 hover:text-white">
            Privacy Policy
          </Link>
          .
        </p>
      </main>
    </div>
  );
};

export default Register;
