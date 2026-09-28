import React from "react";
import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import WhySection from "@/components/landing/WhySection";
import HowItWorks from "@/components/landing/HowItWorks";
import ProductTour from "@/components/landing/ProductTour";
import NetworkSection from "@/components/landing/NetworkSection";
import Stories from "@/components/landing/Stories";
import ClosingCta from "@/components/landing/ClosingCta";
import LandingFooter from "@/components/landing/LandingFooter";
import { useReveal } from "@/components/landing/primitives";

const Index = () => {
  useReveal();

  return (
    // `relative z-[1]` lifts the page above the app's fixed grain/glow layers
    <div className="relative z-[1] min-h-screen bg-lp-paper font-ui text-lp-ink antialiased selection:bg-lp-pen/20">
      <LandingNav />
      <main>
        <Hero />
        <WhySection />
        <HowItWorks />
        <ProductTour />
        <NetworkSection />
        <Stories />
        <ClosingCta />
      </main>
      <LandingFooter />
    </div>
  );
};

export default Index;
