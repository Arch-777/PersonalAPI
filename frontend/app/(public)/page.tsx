import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LandingPage({
  searchParams,
}: {
  searchParams: { auth?: string };
}) {
  const showLogin = searchParams.auth === "login";
  const showSignup = searchParams.auth === "signup";

  return (
    <div className="flex flex-col gap-10">
      {/* Hero Section */}
      <section className="py-20 text-center container mx-auto px-4">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
          Your Personal Digital Brain, Unified.
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Connect Notion, Slack, Telegram, and Google Drive into one searchable knowledge base.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/?auth=signup">
            <Button size="lg">Get Started</Button>
          </Link>
          <Button variant="outline" size="lg">View Demo</Button>
        </div>
      </section>

      {/* Features Grid Placeholder */}
      <section className="py-10 bg-muted/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-8">Everything in one place</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-background rounded-lg shadow-sm border">
              <h3 className="font-bold text-lg mb-2">Semantic Search</h3>
              <p className="text-muted-foreground">Search across all your apps instantly.</p>
            </div>
            <div className="p-6 bg-background rounded-lg shadow-sm border">
               <h3 className="font-bold text-lg mb-2">RAG AI Chat</h3>
               <p className="text-muted-foreground">Ask questions to your personal data.</p>
            </div>
            <div className="p-6 bg-background rounded-lg shadow-sm border">
               <h3 className="font-bold text-lg mb-2">Private & Secure</h3>
               <p className="text-muted-foreground">Your data stays yours.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Modals Placeholder */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-8 rounded-lg shadow-lg max-w-md w-full relative">
            <Link href="/" className="absolute top-2 right-2 text-muted-foreground">X</Link>
            <h2 className="text-2xl font-bold mb-4">Welcome Back</h2>
            <p className="mb-4">Login functionality coming soon.</p>
            <Link href="/dashboard"><Button className="w-full">Continue to Dashboard</Button></Link>
          </div>
        </div>
      )}
      
       {showSignup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-8 rounded-lg shadow-lg max-w-md w-full relative">
            <Link href="/" className="absolute top-2 right-2 text-muted-foreground">X</Link>
            <h2 className="text-2xl font-bold mb-4">Create Account</h2>
             <p className="mb-4">Signup functionality coming soon.</p>
            <Link href="/dashboard"><Button className="w-full">Create Account</Button></Link>
          </div>
        </div>
      )}

    </div>
  );
}
