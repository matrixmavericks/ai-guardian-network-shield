import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="py-24 px-6 md:px-10 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-20 w-96 h-96 bg-indigo-500 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-400/20 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-sm text-blue-300 font-medium">Now with Student Portfolios & Capstone Submissions</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            The Complete <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">AI Learning Platform</span> for Schools
          </h1>
          <p className="text-lg text-slate-300 mb-8 leading-relaxed">
            From ethical AI filtering to student portfolios, capstone projects, and adaptive learning paths — Refyn gives educators full control while empowering students to learn smarter.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/signup">
              <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white w-full sm:w-auto text-base px-8">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800 w-full sm:w-auto text-base">
                View Demo
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature showcase card */}
        <div className="relative">
          <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span className="text-xs text-slate-500 ml-2 font-mono">ai-conditioner</span>
            </div>
            <div className="mb-3 bg-slate-900/60 rounded-lg p-3 border border-slate-700/30">
              <p className="font-mono text-xs text-slate-500 mb-1">Student Prompt:</p>
              <p className="text-sm text-slate-200">What is 7x + 39x?</p>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-3 border-l-2 border-blue-400 mb-3">
              <p className="font-mono text-xs text-blue-400 mb-1">AI Conditioner Processing...</p>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse [animation-delay:200ms]" />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse [animation-delay:400ms]" />
              </div>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/30">
              <p className="font-mono text-xs text-slate-500 mb-1">Modified Response:</p>
              <p className="text-sm text-slate-200">
                Let me guide you through solving 7x + 39x:
                <br />
                <span className="text-slate-400">1.</span> Identify like terms with variable x
                <br />
                <span className="text-slate-400">2.</span> Apply: (7+39)x
                <br />
                <span className="text-slate-400">3.</span> Result: <span className="text-cyan-300 font-semibold">46x</span>
              </p>
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl px-4 py-3 shadow-lg shadow-blue-500/25">
            <p className="text-white text-xs font-bold">Process-Focused</p>
            <p className="text-blue-100 text-xs">Learning First</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
