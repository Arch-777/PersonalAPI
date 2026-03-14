import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";

import { Providers } from "@/app/providers";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-sans",
});

export const metadata: Metadata = {
  title: "PersonalAPI",
  description: "Your Personal Digital Brain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={notoSans.variable}>
      <body
        className={`antialiased font-sans`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
