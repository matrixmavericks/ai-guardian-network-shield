import React from "react";
import { Link } from "react-router-dom";
import { Container } from "./primitives";
import { Wordmark } from "./LandingNav";

const columns = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how" },
      { label: "Inside Refyn", href: "#product" },
      { label: "Guided tour", to: "/tour" },
      { label: "Live demo", to: "/demo" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", to: "/login" },
      { label: "Get started", to: "/signup" },
      { label: "Register your school", to: "/register" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms & Conditions", to: "/legal/terms" },
      { label: "Privacy Policy", to: "/legal/privacy" },
      { label: "Data Protection", to: "/legal/data-protection" },
    ],
  },
];

const LandingFooter = () => (
  <footer className="overflow-hidden bg-lp-night text-lp-night-soft">
    <Container className="pt-16 lg:pt-20">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <Wordmark className="text-lp-paper" />
          <p className="mt-4 max-w-[22rem] text-[15px] leading-[1.6]">
            Ethical AI use, adaptive learning and student portfolios, in one platform for schools.
          </p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title} className="md:col-span-2">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-lp-paper">{col.title}</h3>
            <ul className="mt-4 space-y-2.5 text-[14.5px]">
              {col.links.map((l) => (
                <li key={l.label}>
                  {"to" in l ? (
                    <Link to={l.to} className="transition-colors hover:text-lp-paper">
                      {l.label}
                    </Link>
                  ) : (
                    <a href={l.href} className="transition-colors hover:text-lp-paper">
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mt-16 flex flex-col gap-2 border-t border-lp-night-line py-6 text-[13px] sm:flex-row sm:justify-between">
        <p>&copy; {new Date().getFullYear()} Refyn Technologies. All rights reserved.</p>
        <p>Made for classrooms that want to keep AI, and keep the learning.</p>
      </div>
    </Container>
    <p
      aria-hidden
      className="pointer-events-none -mb-[0.24em] select-none text-center font-display text-[31vw] leading-[0.8] tracking-[-0.04em] text-[#1F2227]"
    >
      Refyn
    </p>
  </footer>
);

export default LandingFooter;
