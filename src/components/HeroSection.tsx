
import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="py-20 px-6 md:px-10 bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-4">
            Ensuring <span className="text-blue-600">Ethical AI Usage</span> in Educational Environments
          </h1>
          <p className="text-xl text-slate-700 mb-8">
            Our network-level AI filter detects and transforms prompts to ensure students learn processes, not just answers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/signup">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Watch Demo
            </Button>
          </div>
        </div>
        <div className="relative">
          <div className="bg-white rounded-lg shadow-xl p-6 border border-slate-200">
            <div className="mb-4 bg-slate-100 rounded p-3 text-slate-800">
              <p className="font-mono text-sm mb-1">Student Request:</p>
              <p className="font-medium">What is 7x + 39x?</p>
            </div>
            <div className="bg-blue-50 rounded p-3 border-l-4 border-blue-400 mb-4">
              <p className="font-mono text-sm text-blue-700 mb-1">AI Conditioner Processing...</p>
            </div>
            <div className="bg-slate-100 rounded p-3 text-slate-800">
              <p className="font-mono text-sm mb-1">Modified Response:</p>
              <p className="font-medium">
                Let me guide you through solving 7x + 39x:
                <br />
                1. Identify like terms: Both 7x and 39x are like terms with variable x
                <br />
                2. Apply distributive property: (7+39)x
                <br />
                3. Add the coefficients: 46x
                <br />
                <span className="text-blue-600">This approach teaches algebraic simplification rather than just giving the answer.</span>
              </p>
            </div>
          </div>
          <div className="absolute -bottom-5 -right-5 w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
            Process<br />Focused
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
