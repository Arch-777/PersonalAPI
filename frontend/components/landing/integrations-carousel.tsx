"use client";

import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const integrations = [
  "Notion",
  "Slack",
  "Telegram",
  "Google Drive",
  "Spotify",
  "GitHub",
  "Linear",
  "Obsidian",
];

export function IntegrationsCarousel() {
  const ref = useScrollReveal();

  return (
    <section
      id="integrations"
      className="py-24 sm:py-32 bg-muted/30 dark:bg-muted/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <p
            className="text-xs font-semibold uppercase tracking-[0.2em] mb-3 text-primary"
          >
            INTEGRATIONS
          </p>
          <h2
            className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-foreground"
          >
            Connect your entire stack
          </h2>
          <p className="text-lg text-muted-foreground">
            Works with the tools you already use.
          </p>
        </div>

        {/* Marquee strip */}
        <div ref={ref} className="reveal overflow-hidden mb-8">
          <div className="animate-marquee flex w-max gap-4">
            {/* Render two identical sets for seamless loop */}
            {[...integrations, ...integrations].map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="inline-flex items-center rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-5 py-2.5 text-sm font-medium whitespace-nowrap text-foreground"
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Subtext */}
        <p className="text-center text-sm text-muted-foreground">
          More integrations added regularly.
        </p>
      </div>
    </section>
  );
}
