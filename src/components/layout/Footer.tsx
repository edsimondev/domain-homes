import Link from "next/link";
import {
  RiFacebookFill,
  RiInstagramLine,
  RiTwitterXFill,
  RiLinkedinFill,
  RiPhoneLine,
  RiMailLine,
  RiMapPin2Line,
} from "react-icons/ri";

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Domaine";

export default function Footer() {
  return (
    <footer className="bg-[#1e1200] text-[#F5F0E8] overflow-hidden">

      {/* ── Main grid ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-16">

          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="mb-5">
              <span
                className="font-black text-[#F5F0E8] tracking-tight leading-none"
                style={{ fontSize: "clamp(1.6rem, 3vw, 2rem)", letterSpacing: "-0.03em" }}
              >
                {SITE_NAME}
              </span>
              <div className="w-8 h-0.5 bg-[#B8894A] mt-3" />
            </div>
            <p className="text-[#F5F0E8]/40 text-sm leading-relaxed mb-6 max-w-xs">
              Your trusted partner in finding the perfect home. Premium
              properties, expert agents, and intelligent tools.
            </p>
            <div className="flex gap-2">
              {[
                { icon: RiFacebookFill, href: "#", label: "Facebook" },
                { icon: RiInstagramLine, href: "#", label: "Instagram" },
                { icon: RiTwitterXFill, href: "#", label: "X" },
                { icon: RiLinkedinFill, href: "#", label: "LinkedIn" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-8 h-8 rounded-full bg-[#F5F0E8]/6 hover:bg-[#B8894A]/20 flex items-center justify-center text-[#F5F0E8]/40 hover:text-[#B8894A] transition-all"
                >
                  <Icon size={13} />
                </a>
              ))}
            </div>
          </div>

          {/* Properties */}
          <div>
            <h4 className="text-[#B8894A] font-semibold text-xs uppercase tracking-widest mb-5">
              Properties
            </h4>
            <ul className="space-y-3">
              {[
                { href: "/listings?listing_type=sale", label: "Homes for Sale" },
                { href: "/listings?listing_type=rent", label: "Homes for Rent" },
                { href: "/listings?property_type=apartment", label: "Apartments" },
                { href: "/listings?is_featured=true", label: "Featured Listings" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-[#F5F0E8]/45 hover:text-[#F5F0E8] transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-[#B8894A] font-semibold text-xs uppercase tracking-widest mb-5">
              Company
            </h4>
            <ul className="space-y-3">
              {[
                { href: "/agents", label: "Our Agents" },
                { href: "/blog",   label: "Journal" },
                { href: "/contact", label: "Contact" },
                { href: "/admin",  label: "Agent Portal" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-[#F5F0E8]/45 hover:text-[#F5F0E8] transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[#B8894A] font-semibold text-xs uppercase tracking-widest mb-5">
              Contact
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-2.5">
                <RiMapPin2Line className="text-[#B8894A]/60 mt-0.5 shrink-0" size={14} />
                <span className="text-sm text-[#F5F0E8]/45">
                  123 Realty Ave, Suite 400
                  <br />
                  New York, NY 10001
                </span>
              </li>
              <li>
                <a
                  href="tel:+15551234567"
                  className="flex items-center gap-2.5 text-sm text-[#F5F0E8]/45 hover:text-[#F5F0E8] transition-colors"
                >
                  <RiPhoneLine className="text-[#B8894A]/60 shrink-0" size={14} />
                  +1 (555) 123-4567
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@domaine.co"
                  className="flex items-center gap-2.5 text-sm text-[#F5F0E8]/45 hover:text-[#F5F0E8] transition-colors"
                >
                  <RiMailLine className="text-[#B8894A]/60 shrink-0" size={14} />
                  hello@domaine.co
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Divider ───────────────────────────────────────────── */}
        <div className="h-px bg-[#F5F0E8]/6 mb-0" />
      </div>

      {/* ── Premium wordmark block ────────────────────────────── */}
      {/*
        Design intent:
        - The word DOMAINE is rendered in two layers:
          1. A large outlined (stroke) version — very subtle, almost invisible
          2. A solid filled version slightly offset — creates a layered depth effect
        - A thin gold rule sits above it, anchoring it to the footer
        - "Est. 2024  ·  Real Estate" sits centered between the two layers
        - On mobile the text is clipped by overflow:hidden on the footer itself
          so it never causes horizontal scroll
      */}
      <div className="relative select-none" aria-hidden="true">

        {/* Gold accent line */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center gap-4 py-6">
            <div className="h-px flex-1 bg-[#B8894A]/20" />
            <span className="text-[10px] font-semibold tracking-[0.25em] uppercase text-[#B8894A]/60">
              Est. 2024 &nbsp;&middot;&nbsp; Real Estate
            </span>
            <div className="h-px flex-1 bg-[#B8894A]/20" />
          </div>
        </div>

        {/* Wordmark layers */}
        <div className="relative overflow-hidden" style={{ height: "clamp(80px, 18vw, 200px)" }}>

          {/* Layer 1 — outlined ghost text (slightly larger, shifted up) */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: "translateY(-9%)" }}
          >
            <span
              className="font-black text-transparent leading-none whitespace-nowrap"
              style={{
                fontSize: "clamp(5.5rem, 20vw, 22rem)",
                letterSpacing: "-0.04em",
                WebkitTextStroke: "1px rgba(245,240,232,0.06)",
              }}
            >
              DOMAINE
            </span>
          </div>

          {/* Layer 2 — solid filled, slightly smaller, shifted down */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: "translateY(-3%)" }}
          >
            <span
              className="font-black leading-none whitespace-nowrap"
              style={{
                fontSize: "clamp(5rem, 18vw, 20rem)",
                letterSpacing: "-0.04em",
                color: "rgba(245,240,232,0.03)",
              }}
            >
              DOMAINE
            </span>
          </div>

          {/* Layer 3 — gold gradient shimmer overlay, masks left/right edges */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(to right, #1e1200 0%, transparent 15%, transparent 85%, #1e1200 100%)",
            }}
          />
        </div>
      </div>

      {/* ── Bottom bar ────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#F5F0E8]/5">
        <p className="text-xs text-[#F5F0E8]/20">
          &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </p>
        <div className="flex gap-6">
          {["Privacy Policy", "Terms of Service"].map((item) => (
            <Link
              key={item}
              href="#"
              className="text-xs text-[#F5F0E8]/20 hover:text-[#F5F0E8]/50 transition-colors"
            >
              {item}
            </Link>
          ))}
        </div>
      </div>

    </footer>
  );
}
