import React from "react";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    quote: "AI Conditioner transformed how our students interact with AI. The portfolio feature lets them showcase their learning journey beautifully.",
    author: "Dr. Sarah Johnson",
    role: "Principal, Westlake High School",
  },
  {
    quote: "Students love customizing their portfolio themes. The shared links make it easy for parents and colleges to see their best work.",
    author: "Michael Chen",
    role: "IT Director, Lincoln School District",
  },
  {
    quote: "The capstone-to-assignment submission flow saved us hours. Students connect their learning paths directly to coursework now.",
    author: "Prof. Robert Martinez",
    role: "Educational Technology Coordinator",
  },
];

const Testimonials = () => {
  return (
    <section className="py-20 px-6 md:px-10 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Trusted by Educators</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Join hundreds of educational institutions using Refyn to promote ethical AI use and empower student learning.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-none shadow-lg bg-gradient-to-br from-slate-50 to-white">
              <CardContent className="p-6">
                <div className="mb-4 text-amber-400 flex gap-0.5 text-lg">
                  {"★★★★★".split("").map((star, i) => (
                    <span key={i}>{star}</span>
                  ))}
                </div>
                <p className="text-slate-700 mb-6 italic leading-relaxed">"{testimonial.quote}"</p>
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
