import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Network, Lock, Palette, BookOpen, Users, Brain, FolderOpen, GraduationCap } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Ethical AI Filter",
    description: "Transforms problematic prompts into learning opportunities, ensuring students understand processes rather than copying answers.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: FolderOpen,
    title: "Student Portfolios",
    description: "Students build professional portfolios showcasing their work. Customizable themes, cover images, and shareable public links.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: GraduationCap,
    title: "Capstone Submissions",
    description: "Students can submit capstone projects directly as assignment submissions, connecting learning paths to coursework seamlessly.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: Palette,
    title: "Portfolio Themes",
    description: "Six stunning theme presets — Midnight, Sunset, Forest, Lavender, and more — visible to anyone who views the shared portfolio.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: Brain,
    title: "Adaptive Learning Paths",
    description: "AI-generated personalized learning paths with modules, quizzes, and capstone projects tailored to each student's level.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Network,
    title: "Network-Level Integration",
    description: "Deploy at the network level to ensure all AI interactions are monitored and filtered, regardless of device or connection.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
  {
    icon: Lock,
    title: "Bypass Prevention",
    description: "Advanced security blocks VPN, DNS, and proxy bypass attempts — keeping students within the guided learning environment.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    description: "Admins, teachers, students, and parents each get tailored dashboards with appropriate permissions and views.",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    icon: BookOpen,
    title: "Class & Assignment Management",
    description: "Teachers create classes, post assignments with group support, grade submissions, and manage resources — all in one place.",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
  },
];

const FeatureCards = () => {
  return (
    <section className="py-20 px-6 md:px-10 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Everything You Need</h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            A complete platform that combines ethical AI usage, learning management, and student portfolios.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow bg-white">
              <CardHeader className="pb-3">
                <div className={`${feature.bg} rounded-lg h-10 w-10 flex items-center justify-center mb-3`}>
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureCards;
