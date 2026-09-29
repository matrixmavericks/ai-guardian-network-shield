import { Link } from "react-router-dom";
import { ArrowLeft, School } from "lucide-react";
import { Wordmark } from "@/components/landing/LandingNav";

/**
 * Shown in the Android app in place of sign-up and payment pages, which Google
 * Play doesn't allow outside its own billing.
 */
const AppAccountNotice = () => (
  <main className="lp-app flex min-h-screen flex-col bg-lp-bg px-6 py-8 font-ui text-white antialiased">
    <Link to="/login" aria-label="Back to sign in" className="self-start text-white">
      <Wordmark />
    </Link>
    <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lp-blue/15 text-lp-sky">
        <School className="h-6 w-6" />
      </span>
      <h1 className="mt-5 text-[28px] font-semibold leading-tight tracking-[-0.03em]">Your school sets up your account</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-lp-soft">
        Refyn accounts and plans are arranged by schools. If your school uses Refyn, your teacher or school admin will give you your login details, or a student ID card.
      </p>
      <Link
        to="/login"
        className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-lp-blue px-5 text-[14.5px] font-medium text-white transition-colors hover:bg-[#2F6FE0]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
    </div>
  </main>
);

export default AppAccountNotice;
