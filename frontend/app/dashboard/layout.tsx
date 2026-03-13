import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/10 hidden md:block">
        <div className="p-6 border-b">
           <Link href="/dashboard" className="text-xl font-bold">PersonalAPI</Link>
        </div>
        <nav className="p-4 space-y-2">
          <Link href="/dashboard">
            <Button variant="ghost" className="w-full justify-start">Home</Button>
          </Link>
          <Link href="/dashboard/search">
            <Button variant="ghost" className="w-full justify-start">Search & Chat</Button>
          </Link>
          <Link href="/dashboard/integrations">
            <Button variant="ghost" className="w-full justify-start">Integrations</Button>
          </Link>
           <div className="pt-4 pb-2 px-4 text-xs font-semibold text-muted-foreground uppercase">Settings</div>
           <Link href="/dashboard/api-keys">
            <Button variant="ghost" className="w-full justify-start">API & Tokens</Button>
          </Link>
           <Link href="/dashboard/pricing">
            <Button variant="ghost" className="w-full justify-start">Pricing & Plans</Button>
          </Link>
          <Link href="/dashboard/settings">
            <Button variant="ghost" className="w-full justify-start">Profile</Button>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center px-6 justify-between">
              <div className="font-semibold">Dashboard</div>
              <div className="text-sm">User</div>
          </header>
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
