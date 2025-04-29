
import React from "react";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    quote: "AI Conditioner transformed how our students interact with AI. They now focus on learning the process rather than just getting answers.",
    author: "Dr. Sarah Johnson",
    role: "Principal, Westlake High School"
  },
  {
    quote: "The network-level integration was seamless, and our IT department appreciates the robust bypass prevention features.",
    author: "Michael Chen",
    role: "IT Director, Lincoln School District"
  },
  {
    quote: "We've seen a 60% increase in students using AI for legitimate learning purposes since implementing AI Conditioner.",
    author: "Prof. Robert Martinez",
    role: "Educational Technology Coordinator"
  }
];

const Testimonials = () => {
  return (
    <section className="py-16 px-6 md:px-10 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4 text-slate-800">Trusted by Educators</h2>
        <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
          Join hundreds of educational institutions already using AI Conditioner to promote ethical AI usage.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4 text-yellow-500 flex">
                  {"★★★★★".split("").map((star, i) => (
                    <span key={i}>{star}</span>
                  ))}
                </div>
                <p className="text-slate-700 mb-6 italic">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold text-slate-900">{testimonial.author}</p>
                  <p className="text-slate-500 text-sm">{testimonial.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
