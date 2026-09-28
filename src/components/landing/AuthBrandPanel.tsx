import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import misLogo from "@/assets/photos/mis-logo.png";
import BoomerangVideoBg from "./BoomerangVideoBg";
import { Wordmark } from "./LandingNav";
import { BG_VIDEO } from "./media";

/** Video panel on the left (desktop only). */
const AuthBrandPanel = () => (
  <aside className="relative m-3 hidden overflow-hidden rounded-[28px] border border-white/10 lg:flex lg:flex-col">
    <BoomerangVideoBg
      src={BG_VIDEO}
      className="absolute inset-0 h-full w-full"
      mediaClassName="grayscale contrast-[1.1] brightness-[1.15]"
    />
    <div aria-hidden className="absolute inset-0 bg-[#2563EB] opacity-80 mix-blend-color" />
    <div aria-hidden className="absolute inset-0 bg-[#0B1A45] opacity-30 mix-blend-multiply" />
    <div
      aria-hidden
      className="absolute inset-0"
      style={{ background: "linear-gradient(180deg, rgba(3,6,15,0.5) 0%, rgba(3,6,15,0) 35%, rgba(3,6,15,0.1) 55%, rgba(3,6,15,0.85) 100%)" }}
    />

    <div className="relative z-10 flex items-center justify-between p-8">
      <Link to="/" aria-label="Refyn home" className="text-white">
        <Wordmark />
      </Link>
      <Link to="/" className="flex items-center gap-1.5 text-[13px] font-medium text-white/80 transition-colors hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to site
      </Link>
    </div>

    {/* A glimpse of Guided mode */}
    <div className="lp-fade relative z-10 mx-8 mt-auto max-w-[360px] rounded-2xl border border-white/15 bg-[#0A1328]/70 p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl">
      <p className="ml-auto w-fit rounded-2xl rounded-br-md bg-lp-blue px-3.5 py-2 text-[13.5px] text-white">
        can you just give me the answer to 7x + 39x
      </p>
      <p className="mt-2.5 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-3.5 py-2 text-[13.5px] text-white/90">
        <Sparkles aria-hidden className="mr-1.5 inline h-3.5 w-3.5 -translate-y-px text-lp-cyan" />
        They're like terms. What do you get when you add 7 and 39?
      </p>
    </div>

    <div className="relative z-10 p-8 pt-8">
      <p className="lp-fade max-w-[26rem] text-[40px] font-normal leading-[0.98] tracking-[-0.045em] text-white" style={{ animationDelay: "80ms", animationFillMode: "both" }}>
        AI that teaches the thinking,{" "}
        <span className="bg-gradient-to-r from-[#93C5FD] via-[#BFDBFE] to-lp-cyan bg-clip-text text-transparent">not the answer.</span>
      </p>
      <div className="lp-fade mt-6 flex items-center gap-3" style={{ animationDelay: "160ms", animationFillMode: "both" }}>
        <span className="rounded-lg bg-[#FFFFFF] px-2 py-1.5">
          <img src={misLogo} alt="" width={239} height={151} className="h-7 w-auto" />
        </span>
        <span className="text-[13px] leading-snug text-white/75">
          Now piloting at
          <br />
          <span className="font-medium text-white">Mahindra International School, Pune</span>
        </span>
      </div>
    </div>
  </aside>
);

export default AuthBrandPanel;
