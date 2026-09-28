import React from "react";
import { Link } from "react-router-dom";
import { Container } from "./primitives";
import { Wordmark } from "./LandingNav";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Why Refyn", href: "#why" },
      { label: "How it works", href: "#how" },
      { label: "Platform", href: "#product" },
      { label: "Guided tour", to: "/tour" },
      { label: "Live demo", to: "/demo" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", to: "/login" },
      { label: "Get started", to: "/register" },
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

const linkClass = "text-lp-soft transition-colors hover:text-white";

const LandingFooter = () => (
  <footer className="relative overflow-hidden border-t border-lp-line bg-lp-deep">
    <Container className="relative pt-16 lg:pt-20">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <Wordmark className="text-white" />
          <p className="mt-4 max-w-[22rem] text-[15px] leading-[1.6] text-lp-soft">
            Ethical AI use, adaptive learning and student portfolios, in one platform for schools.
          </p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title} className="md:col-span-2">
            <h3 className="text-[12px] font-medium uppercase tracking-[0.18em] text-lp-mute">{col.title}</h3>
            <ul className="mt-4 space-y-2.5 text-[14.5px]">
              {col.links.map((l) => (
                <li key={l.label}>
                  {"to" in l ? (
                    <Link to={l.to} className={linkClass}>
                      {l.label}
                    </Link>
                  ) : (
                    <a href={l.href} className={linkClass}>
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mt-16 flex flex-col gap-2 border-t border-lp-line py-6 text-[13px] text-lp-mute sm:flex-row sm:justify-between">
        <p>&copy; {new Date().getFullYear()} Refyn Technologies. All rights reserved.</p>
        <p>Keep the AI. Keep the learning.</p>
      </div>
    </Container>
    <p
      aria-hidden
      className="pointer-events-none -mb-[0.22em] select-none bg-gradient-to-b from-lp-blue/25 to-transparent bg-clip-text text-center text-[30vw] font-semibold leading-[0.8] tracking-[-0.06em] text-transparent"
    >
      Refyn
    </p>
  </footer>
);

export default LandingFooter;
