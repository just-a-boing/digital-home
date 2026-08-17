"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import gateImage from "@/assets/gate.jpg";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("The email or password is incorrect.");
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#101014] text-[#f5efe7]">
      {/* Gate background */}
      <div className="absolute inset-0">
        <img
          src={gateImage.src}
          alt=""
          className="h-full w-full object-cover object-center"
        />

        {/* Dark cinematic overlay */}
        <div className="absolute inset-0 bg-black/45" />

        {/* Subtle vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.55)_100%)]" />
      </div>

      {/* Login content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mb-6 text-3xl">🌙</div>

            <h1 className="font-serif text-4xl tracking-wide">
              Our Home
            </h1>

            <p className="mt-3 text-sm text-white/70">
              Our little corner of the internet.
            </p>
          </div>

          {/* Login */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm text-white/70"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3.5 text-sm outline-none backdrop-blur-md transition placeholder:text-white/30 focus:border-white/40 focus:bg-black/40"
                placeholder="Your email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm text-white/70"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3.5 text-sm outline-none backdrop-blur-md transition placeholder:text-white/30 focus:border-white/40 focus:bg-black/40"
                placeholder="Your password"
              />
            </div>

            {error && (
              <p className="text-center text-sm text-[#e5a0a8]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#b84c5a] px-4 py-3.5 text-sm font-medium text-white shadow-lg shadow-black/20 transition hover:bg-[#c65a68] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Entering..." : "Enter our home"}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-xs tracking-wide text-white/40">
            private · just ours
          </p>
        </div>
      </div>
    </main>
  );
}