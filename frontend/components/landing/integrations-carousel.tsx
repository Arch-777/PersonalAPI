'use client'

import { useTheme } from 'next-themes'
import { useScrollReveal } from '@/hooks/use-scroll-reveal'

// Plain names — NO emoji prefix, NO ✦
const tickerItems = [
  'NOTION', 'SLACK', 'GMAIL', 'GOOGLE DRIVE', 'GITHUB',
  'TELEGRAM', 'DISCORD', 'SPOTIFY', 'GOOGLE DOCS',
  'GOOGLE CALENDAR', 'GOOGLE SHEETS', 'LINEAR',
]

export function IntegrationsCarousel() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const headerRef = useScrollReveal()

  return (
    <section id="integrations" className="relative py-24 sm:py-32">

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6 mb-16">
        <div className="h-px" style={{
          background: isDark
            ? 'linear-gradient(to right, transparent, rgba(255,255,255,0.10), transparent)'
            : 'linear-gradient(to right, transparent, rgba(0,0,0,0.10), transparent)',
        }} />
      </div>

      {/* Header */}
      <div ref={headerRef} className="reveal text-center px-4 mb-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-3 text-primary">
          INTEGRATIONS
        </p>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-foreground">
          Connect your entire stack
        </h2>
        <p className="text-base text-muted-foreground max-w-lg mx-auto">
          Works with the tools you already use. Connect once, search everything.
        </p>
      </div>

      {/* ── Single solid ticker band ── */}
      <div
        className="w-full overflow-hidden"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          // Pure near-black — matches Image 2 exactly
          background: '#0c0c0f',
        }}
      >
        <div
          className="flex w-max py-[14px] animate-marquee"
        >
          {/* 3× copies for seamless -33.333% loop */}
          {[...tickerItems, ...tickerItems, ...tickerItems].map((item, i) => (
            <span key={i} className="flex items-center">
              <span
                className="text-[13px] font-bold uppercase whitespace-nowrap"
                style={{
                  letterSpacing: '0.14em',
                  color: 'rgba(255,255,255,0.50)',
                  padding: '0 28px',
                }}
              >
                {item}
              </span>
              <span
                style={{
                  color: 'rgba(255,255,255,0.22)',
                  fontSize: '14px',
                  lineHeight: 1,
                }}
              >
                ★
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Subtext */}
      <p className="text-center text-sm text-muted-foreground mt-10">
        More integrations shipped every sprint.
      </p>
    </section>
  )
}
