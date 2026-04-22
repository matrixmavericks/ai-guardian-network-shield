import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import logo from "@/assets/logo.png";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4";

const MARQUEE_LOGOS = ["Vortex", "Nimbus", "Prysma", "Cirrus", "Kynder", "Halcyn"];

const HeroSection = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const FADE = 0.5;
    let cancelled = false;

    const tick = () => {
      if (cancelled || !video) return;
      const d = video.duration;
      const t = video.currentTime;
      if (d && !isNaN(d)) {
        let opacity = 1;
        if (t < FADE) opacity = t / FADE;
        else if (t > d - FADE) opacity = Math.max(0, (d - t) / FADE);
        video.style.opacity = String(opacity);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const handleEnded = () => {
      video.style.opacity = "0";
      setTimeout(() => {
        if (cancelled) return;
        video.currentTime = 0;
        video.play().catch(() => {});
      }, 100);
    };

    video.style.opacity = "0";
    video.play().catch(() => {});
    rafRef.current = requestAnimationFrame(tick);
    video.addEventListener("ended", handleEnded);

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  const navItems: { label: string; hasChevron?: boolean }[] = [
    { label: "Features", hasChevron: true },
    { label: "Solutions" },
    { label: "Plans" },
    { label: "Learning", hasChevron: true },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Background video */}
      <video
        ref={videoRef}
        src={VIDEO_URL}
        muted
        playsInline
        autoPlay
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0, transition: "none" }}
      />

      {/* Hero section */}
      <section className="relative z-10 min-h-screen flex flex-col overflow-visible">
        {/* Navbar */}
        <div className="relative w-full">
          <nav className="flex items-center justify-between py-5 px-8">
            <div className="flex items-center">
              <img src={logo} alt="Refyn" style={{ height: 32 }} />
            </div>
            <div className="hidden md:flex items-center gap-2">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  className="flex items-center gap-1 text-foreground/90 hover:text-foreground text-sm font-medium px-3 py-2 transition-colors"
                >
                  {item.label}
                  {item.hasChevron && <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
            <div className="flex items-center">
              <Link to="/signup">
                <Button variant="heroSecondary" className="rounded-full px-4 py-2 h-auto text-sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          </nav>
          <div
            className="h-px w-full bg-gradient-to-r from-transparent via-foreground/20 to-transparent"
            style={{ marginTop: 3 }}
          />
        </div>

        {/* Hero content */}
        <div className="relative flex-1 flex items-center justify-center overflow-visible">
          {/* Blurred overlay shape */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-90 bg-gray-950 pointer-events-none"
            style={{ width: 984, height: 527, filter: "blur(82px)" }}
          />

          <div className="relative z-10 flex flex-col items-center text-center px-6">
            <h1
              className="font-display font-normal text-foreground"
              style={{
                fontSize: "clamp(80px, 16vw, 220px)",
                lineHeight: 1.02,
                letterSpacing: "-0.024em",
              }}
            >
              Power{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: "linear-gradient(to left, #6366f1, #a855f7, #fcd34d)",
                }}
              >
                AI
              </span>
            </h1>
            <p
              className="text-hero-sub text-lg leading-8 max-w-md opacity-80"
              style={{ marginTop: 9 }}
            >
              The most powerful AI ever deployed
              <br />
              in talent acquisition
            </p>
            <Link to="/signup" style={{ marginTop: 25 }}>
              <Button
                variant="heroSecondary"
                className="rounded-full h-auto text-base"
                style={{ paddingLeft: 29, paddingRight: 29, paddingTop: 24, paddingBottom: 24 }}
              >
                Schedule a Consult
              </Button>
            </Link>
          </div>
        </div>

        {/* Marquee */}
        <div className="relative z-10 pb-10">
          <div className="max-w-5xl mx-auto px-6 flex items-center gap-12">
            <div className="text-foreground/50 text-sm flex-shrink-0 leading-tight">
              Relied on by brands
              <br />
              across the globe
            </div>
            <div className="relative flex-1 overflow-hidden">
              <div
                className="flex items-center gap-16 animate-marquee"
                style={{ width: "max-content" }}
              >
                {[...MARQUEE_LOGOS, ...MARQUEE_LOGOS].map((name, i) => (
                  <div key={i} className="flex items-center gap-3 flex-shrink-0">
                    <div className="liquid-glass w-6 h-6 rounded-lg flex items-center justify-center text-foreground text-xs font-semibold">
                      {name.charAt(0)}
                    </div>
                    <span className="text-base font-semibold text-foreground whitespace-nowrap">
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HeroSection;
