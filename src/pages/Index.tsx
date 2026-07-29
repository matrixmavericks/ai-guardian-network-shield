import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Shield, Server, Brain, Palette, FolderOpen, GraduationCap } from "lucide-react";
import HeroSection from "@/components/HeroSection";
import FeatureCards from "@/components/FeatureCards";
import Testimonials from "@/components/Testimonials";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-background/70 backdrop-blur-xl border-b border-border py-3.5 px-6 md:px-10 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center">
          <Shield className="h-6 w-6 text-primary mr-2" />
          <span className="text-lg font-bold text-foreground tracking-tight">Refyn</span>
          <span className="ml-1.5 text-xs text-muted-foreground font-mono">/os</span>
        </div>
        <div className="flex gap-2 items-center">
          <Link to="/tour" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Tour</Button>
          </Link>
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Login</Button>
          </Link>
          <Link to="/signup">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">Get started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <HeroSection />

      {/* Feature Cards */}
      <FeatureCards />

      {/* How It Works */}
      <section className="py-20 px-6 md:px-10 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">From setup to student success in three simple steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                icon: Server,
                step: "01",
                title: "Deploy & Configure",
                desc: "Integrate with your school network. Set AI filtering policies, create classes, and invite teachers and students.",
              },
              {
                icon: Brain,
                step: "02",
                title: "Learn & Create",
                desc: "Students engage with AI-guided learning paths, complete capstone projects, and submit work — all ethically filtered.",
              },
              {
                icon: FolderOpen,
                step: "03",
                title: "Showcase & Share",
                desc: "Students build themed portfolios with their best work and share them via public links with parents, peers, or colleges.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center group">
                <div className="relative mx-auto mb-6">
                  <div className="bg-blue-500/10 rounded-2xl h-16 w-16 flex items-center justify-center mx-auto group-hover:bg-blue-500/20 transition-colors">
                    <item.icon className="h-7 w-7 text-blue-600" />
                  </div>
                  <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-bold text-lg mb-2 text-slate-900">{item.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials />

      {/* CTA Section */}
      <section className="py-20 px-6 md:px-10 bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-1/4 w-64 h-64 bg-white rounded-full blur-[100px]" />
          <div className="absolute bottom-10 right-1/4 w-48 h-48 bg-cyan-300 rounded-full blur-[80px]" />
        </div>
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform AI Learning?</h2>
          <p className="mb-8 text-blue-100 text-lg">
            Join educational institutions worldwide in promoting ethical AI use, building student portfolios, and enabling smarter learning.
          </p>
          <Link to="/signup">
            <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 text-base px-8 font-semibold">
              Get Started for Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-14 px-6 md:px-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <Shield className="h-6 w-6 text-blue-400 mr-2" />
              <span className="text-lg font-bold text-white">Refyn Technologies</span>
            </div>
            <p className="text-sm leading-relaxed">Ethical AI usage, adaptive learning, and student portfolios — the complete educational AI platform.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-4 text-white text-sm uppercase tracking-wider">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">AI Filtering</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Learning Paths</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Student Portfolios</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4 text-white text-sm uppercase tracking-wider">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Support Center</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Webinars</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4 text-white text-sm uppercase tracking-wider">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              <li><a href="/legal/terms" className="hover:text-white transition-colors">Terms & Conditions</a></li>
              <li><a href="/legal/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="/legal/data-protection" className="hover:text-white transition-colors">Data Protection</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto pt-8 mt-8 border-t border-slate-800/50 text-sm text-center text-slate-500">
          &copy; {new Date().getFullYear()} Refyn Technologies. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Index;
