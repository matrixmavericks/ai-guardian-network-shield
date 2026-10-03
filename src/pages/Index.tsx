import React from "react";
import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import WhySection from "@/components/landing/WhySection";
import HowItWorks from "@/components/landing/HowItWorks";
import ClassroomSection from "@/components/landing/ClassroomSection";
import ProductShowcase from "@/components/landing/ProductShowcase";
import NetworkSection from "@/components/landing/NetworkSection";
import ClosingCta from "@/components/landing/ClosingCta";
import LandingFooter from "@/components/landing/LandingFooter";
import DiveSection from "@/components/landing/three/DiveSection";
import ThoughtParticles from "@/components/landing/three/ThoughtParticles";
import WorldsIsland from "@/components/landing/three/WorldsIsland";
import { useReveal } from "@/components/landing/primitives";

const Index = () => {
  useReveal();

  return (
    // `relative z-[1]` lifts the page above the app's fixed grain/glow layers
    <div className="relative z-[1] min-h-screen overflow-x-clip bg-lp-bg font-ui text-lp-text antialiased selection:bg-lp-blue/40 selection:text-white">
      <LandingNav />
      <main>
        <Hero />
        <DiveSection />
        <WhySection />
        <ThoughtParticles />
        <HowItWorks />
        <ClassroomSection />
        <WorldsIsland />
        <ProductShowcase />
        <NetworkSection />
        <ClosingCta />
      </main>
      <LandingFooter />
    </div>
  );
};

export default Index;
