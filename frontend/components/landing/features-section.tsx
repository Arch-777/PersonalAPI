"use client";

import { Search, MessageSquare, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const features = [
  {
    icon: Search,
    title: "Semantic Search",
    description:
      "Find anything across Notion, Slack, Drive, and Telegram with natural language queries.",
  },
  {
    icon: MessageSquare,
    title: "RAG AI Chat",
    description:
      "Ask questions and get AI-generated answers grounded entirely in your personal data.",
  },
  {
    icon: ShieldCheck,
    title: "Private & Secure",
    description:
      "Self-hosted by default. Your data never leaves your infrastructure.",
  },
];

export function FeaturesSection() {
  const ref1 = useScrollReveal();
  const ref2 = useScrollReveal();
  const ref3 = useScrollReveal();
  const calloutRef = useScrollReveal();

  const refs = [ref1, ref2, ref3];

  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <p
            className="text-xs font-semibold uppercase tracking-[0.2em] mb-3 text-primary"
          >
            CAPABILITIES
          </p>
          <h2
            className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-foreground"
          >
            Everything in one place
          </h2>
          <p className="text-lg text-muted-foreground">
            One brain to rule them all.
          </p>
        </div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              ref={refs[i]}
              className="reveal rounded-xl p-6 border border-white/10 bg-white/5 backdrop-blur-sm hover:scale-[1.02] hover:border-[oklch(0.62_0.22_275)]/40 transition-all duration-300"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div
                className="rounded-lg p-3 mb-4 w-fit bg-primary/10 text-primary"
              >
                <feature.icon className="h-6 w-6" />
              </div>
              <h3
                className="text-lg font-bold mb-2 text-foreground"
              >
                {feature.title}
              </h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Roadmap callout card */}
        <div
          ref={calloutRef}
          className="reveal rounded-xl p-6 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-primary/10 to-indigo-500/10"
        >
          <p className="text-muted-foreground">
            More integrations coming soon: Calendar, Email, GitHub, Linear…
          </p>
          <Badge variant="outline" className="border-primary/40 shrink-0 text-primary">
            Roadmap
          </Badge>
        </div>
      </div>
    </section>
  );
}
