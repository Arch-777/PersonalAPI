"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin, useSignup } from "@/hooks/use-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function PasswordStrength({ password }: { password: string }) {
  const getStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return Math.min(score, 4);
  };

  const strength = getStrength();
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-green-400",
    "bg-green-500",
  ];

  if (!password) return null;

  return (
    <div className="flex gap-1 mt-1.5">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-all ${i < strength ? colors[strength] : "bg-white/10"}`}
        />
      ))}
    </div>
  );
}

function parseApiError(err: unknown): string {
  const apiErr = err as {
    response?: {
      status?: number;
      data?: {
        detail?:
          | string
          | Record<string, unknown>
          | Array<{ msg?: string; message?: string }>;
      };
    };
    message?: string;
  };

  const status = apiErr?.response?.status;
  const detail = apiErr?.response?.data?.detail;

  // Network / connection error (no response object)
  if (!apiErr?.response) {
    const msg = apiErr?.message ?? "";
    return msg.toLowerCase().includes("network")
      ? "Network error — please check your connection."
      : "Could not reach the server. Please try again.";
  }

  // HTTP status-specific messages
  if (status === 401) return "Invalid email or password.";
  if (status === 409) return "An account with this email already exists.";
  if (status === 429)
    return "Too many attempts. Please wait a moment and try again.";
  if (status && status >= 500) return "Server error. Please try again later.";

  // FastAPI validation errors (422)
  if (Array.isArray(detail)) {
    return detail
      .map((d) => d.msg || d.message || "Validation error")
      .join(", ");
  }
  if (typeof detail === "object" && detail !== null) {
    return (detail as Record<string, string>).msg || JSON.stringify(detail);
  }
  if (typeof detail === "string" && detail) return detail;

  return "An unexpected error occurred. Please try again.";
}

interface AuthModalProps {
  type: "login" | "signup";
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AuthModal({ type, open, onOpenChange }: AuthModalProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useLogin();
  const signupMutation = useSignup();

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      router.replace("/");
      setError("");
      setPassword("");
    }
    onOpenChange(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const email = formData.get("email") as string;
    const name = formData.get("name") as string;
    // We already have password in state, but can get from formData too
    const pwd = formData.get("password") as string;

    try {
      if (isLogin) {
        await loginMutation.mutateAsync({ email, password: pwd });
      } else {
        await signupMutation.mutateAsync({
          email,
          password: pwd,
          full_name: name,
        });
      }
    } catch (err) {
      // Registration succeeded but auto-login failed — redirect to login
      if ((err as Error)?.message === "SIGNUP_LOGIN_FAILED") {
        router.replace("/?auth=login");
        return;
      }
      setError(parseApiError(err));
    }
  };

  const isLogin = type === "login";
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md border-border bg-background">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            {isLogin ? "Welcome back" : "Create your account"}
          </DialogTitle>
          <DialogDescription>
            {isLogin
              ? "Sign in to your PersonalAPI account"
              : "Start for free. No credit card required."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name field (signup only) */}
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Your name"
                required
                className="bg-white/5 border-white/10"
              />
            </div>
          )}

          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              className="bg-white/5 border-white/10"
            />
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              {isLogin && (
                <Link
                  href="#"
                  className="text-xs transition-colors hover:text-foreground text-primary"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/5 border-white/10"
            />
            {!isLogin && <PasswordStrength password={password} />}
          </div>

          {/* Error alert */}
          {error && (
            <Alert variant="destructive" className="text-sm">
              {error}
            </Alert>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full bg-[oklch(0.62_0.22_275)] hover:bg-[oklch(0.55_0.18_290)] text-white cursor-pointer"
            disabled={loginMutation.isPending || signupMutation.isPending}
          >
            {loginMutation.isPending || signupMutation.isPending
              ? isLogin
                ? "Signing in…"
                : "Creating account…"
              : isLogin
                ? "Sign In"
                : "Create Account"}
          </Button>
        </form>

        {/* Footer link */}
        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? (
            <>
              Don&apos;t have an account?{" "}
              <Link
                href="/?auth=signup"
                className="font-medium hover:underline text-primary"
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link
                href="/?auth=login"
                className="font-medium hover:underline text-primary"
              >
                Log in
              </Link>
            </>
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
}
