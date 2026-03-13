"use client";

import { Search, MessageSquare, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { useTheme } from "next-themes";

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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const ref1 = useScrollReveal();
  const ref2 = useScrollReveal();
  const ref3 = useScrollReveal();
  const calloutRef = useScrollReveal();

  const refs = [ref1, ref2, ref3];

  return (
    <section
      id="features"
      className="py-24 sm:py-32 relative"
      style={{
        background: isDark
          ? "transparent"
          : "linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(168,85,247,0.04) 100%)",
      }}
    >
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
              className="reveal relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 group"
              style={{
                transitionDelay: `${i * 100}ms`,
                background: isDark
                  ? "linear-gradient(135deg, rgba(10,10,20,0.97) 0%, rgba(8,8,18,0.98) 45%, rgba(6,6,14,0.99) 100%)"
                  : "linear-gradient(135deg, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0.72) 35%, rgba(255,255,255,0.78) 100%)",
                backdropFilter: "blur(22px) saturate(220%)",
                WebkitBackdropFilter: "blur(22px) saturate(220%)",
                border: isDark
                  ? "1px solid rgba(255, 255, 255, 0.06)"
                  : "1px solid rgba(255, 255, 255, 0.85)",
                boxShadow: isDark
                  ? "0 18px 45px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255,255,255,0.04)"
                  : "0 12px 40px rgba(0, 0, 0, 0.10), inset 0 1px 0 rgba(255,255,255,0.95)",
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-45"
                style={{
                  background: isDark
                    ? "radial-gradient(600px 220px at 15% -20%, rgba(255,255,255,0.06), transparent 55%), radial-gradient(640px 200px at 100% -10%, rgba(99,102,241,0.14), transparent 60%)"
                    : "radial-gradient(800px 260px at 20% 0%, rgba(255,255,255,0.85), transparent 55%), radial-gradient(700px 220px at 100% 10%, rgba(99,102,241,0.12), transparent 60%)",
                }}
              />
              <div
                className="relative rounded-lg p-3 mb-4 w-fit"
                style={{
                  background: isDark
                    ? "rgba(99,102,241,0.15)"
                    : "rgba(99,102,241,0.12)",
                }}
              >
                <feature.icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3
                className="relative text-lg font-bold mb-2 text-gray-900 dark:text-white"
              >
                {feature.title}
              </h3>
              <p className="relative text-sm leading-relaxed text-gray-600 dark:text-white/60">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Roadmap callout card */}
        <div
          ref={calloutRef}
          className="reveal rounded-xl p-6 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-primary/10 to-indigo-500/10"
        >
          <p className="text-sm text-gray-700 dark:text-white/60">
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
