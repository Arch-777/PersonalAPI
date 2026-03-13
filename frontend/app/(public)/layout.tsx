import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 items-center px-4 border-b">
        <div className="flex w-full items-center justify-between">
          <div className="text-xl font-bold">PersonalAPI</div>
          <nav className="flex items-center gap-4">
             <Link href="/?auth=login"><Button variant="ghost">Log In</Button></Link>
             <Link href="/?auth=signup"><Button>Sign Up</Button></Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="py-6 text-center border-t text-sm text-muted-foreground">
        © 2026 PersonalAPI. All rights reserved.
      </footer>
    </div>
  );
}
