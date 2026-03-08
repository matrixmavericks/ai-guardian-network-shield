
import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Server, Users, Brain } from "lucide-react";
import HeroSection from "@/components/HeroSection";
import FeatureCards from "@/components/FeatureCards";
import Testimonials from "@/components/Testimonials";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm py-4 px-6 md:px-10 flex justify-between items-center">
        <div className="flex items-center">
          <Shield className="h-8 w-8 text-blue-600 mr-2" />
          <span className="text-xl font-bold text-slate-800">Refyn Technologies

          </span>
        </div>
        <div className="flex gap-4">
          <Link to="/login">
            <Button variant="outline">Login</Button>
          </Link>
          <Link to="/signup">
            <Button className="bg-blue-600 hover:bg-blue-700">Sign Up</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <HeroSection />

      {/* Feature Cards */}
      <FeatureCards />

      {/* How It Works */}
      <section className="py-16 px-6 md:px-10 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-slate-800">How AI Conditioner Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                <Server className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">1. Network Integration</h3>
              <p className="text-slate-600">Seamlessly integrates with your network infrastructure to monitor all AI traffic.</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                <Brain className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">2. AI Prompt Analysis</h3>
              <p className="text-slate-600">Intelligently analyzes prompts to ensure they promote learning processes, not just answers.</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">3. Administrative Control</h3>
              <p className="text-slate-600">Provides administrators with complete control over AI usage policies and monitoring.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials />

      {/* CTA Section */}
      <section className="py-16 px-6 md:px-10 bg-blue-600 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform AI Usage in Your Institution?</h2>
          <p className="mb-8 text-blue-100">Join educational institutions worldwide in promoting ethical AI use.</p>
          <Link to="/signup">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">Get Started for Free</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12 px-6 md:px-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <Shield className="h-6 w-6 text-blue-400 mr-2" />
              <span className="text-lg font-bold text-white">AI Conditioner</span>
            </div>
            <p className="text-sm">Ensuring ethical AI use in educational environments through advanced filtering and monitoring.</p>
          </div>
          <div>
            <h3 className="font-bold mb-4 text-white">Product</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">Features</a></li>
              <li><a href="#" className="hover:text-white">Pricing</a></li>
              <li><a href="#" className="hover:text-white">Case Studies</a></li>
              <li><a href="#" className="hover:text-white">Documentation</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-4 text-white">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">Blog</a></li>
              <li><a href="#" className="hover:text-white">Support Center</a></li>
              <li><a href="#" className="hover:text-white">Webinars</a></li>
              <li><a href="#" className="hover:text-white">Partners</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-4 text-white">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white">About Us</a></li>
              <li><a href="#" className="hover:text-white">Careers</a></li>
              <li><a href="#" className="hover:text-white">Contact</a></li>
              <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto pt-8 mt-8 border-t border-slate-800 text-sm text-center">
          &copy; {new Date().getFullYear()} AI Conditioner. All rights reserved.
        </div>
      </footer>
    </div>);};

export default Index;