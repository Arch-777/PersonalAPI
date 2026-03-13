import Link from "next/link";
import { Separator } from "@/components/ui/separator";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Integrations", href: "#integrations" },
    { label: "Pricing", href: "#pricing" },
    { label: "Changelog", href: "#" },
  ],
  Resources: [
    { label: "Documentation", href: "#" },
    { label: "GitHub", href: "#" },
    { label: "API Reference", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Twitter/X", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Separator className="mb-12 opacity-20" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              {/* Brain icon */}
              <svg
                className="h-6 w-6 text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path d="M12 2a7 7 0 0 0-7 7c0 3 2 5.5 4 7l3 3 3-3c2-1.5 4-4 4-7a7 7 0 0 0-7-7z" />
                <circle cx="12" cy="9" r="2" />
              </svg>
              <span
                className="text-lg font-bold text-foreground"
              >
                PersonalAPI
              </span>
            </div>
            <p className="text-sm mb-4 text-muted-foreground">
              Your Personal Digital Brain.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4
                className="text-sm font-semibold mb-4 text-foreground"
              >
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <Separator className="mb-6 opacity-20" />
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 PersonalAPI. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="#"
              className="text-sm transition-colors text-muted-foreground hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="#"
              className="text-sm transition-colors text-muted-foreground hover:text-foreground"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
