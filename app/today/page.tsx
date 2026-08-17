"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

import clock from "@/assets/year.jpg";

type Memory = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  media: string[];
};

export default function TodayPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => {
    const date = new Date();

    return {
      month: date.getMonth() + 1,
      day: date.getDate(),

      formatted: date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      }),
    };
  }, []);

  useEffect(() => {
    const loadTodayMemories = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("memories")
        .select(
          "id, title, description, date, location, media"
        )
        .order("date", { ascending: false });

      if (error) {
        console.error("Failed to load memories:", error);
        setError("Unable to load today's memories.");
        setLoading(false);
        return;
      }

      const matchingMemories = (data ?? []).filter((memory) => {
        const [year, month, day] = memory.date
          .split("-")
          .map(Number);

        return (
          month === today.month &&
          day === today.day
        );
      });

      setMemories(matchingMemories);
      setLoading(false);
    };

    loadTodayMemories();
  }, [today.day, today.month]);

  return (
    <main className="min-h-[100svh] bg-[#f4f0ea] text-[#28231f]">

      {/* ================================================================ */}
      {/* HERO                                                             */}
      {/* ================================================================ */}

      <section className="relative h-[55svh] min-h-[420px] w-full overflow-hidden sm:h-[60svh] sm:min-h-[500px]">

        {/* Background */}
        <Image
          src={clock}
          alt="Today"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Hero content */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center text-white">

          <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.35em] text-white/80 sm:text-xs">
            On this day
          </p>

          <h1 className="font-sans text-5xl font-bold tracking-tight sm:text-7xl md:text-8xl">
            {today.formatted}
          </h1>

          <div className="mt-7 h-px w-12 bg-white/70" />

          <p className="mt-6 text-xs font-medium uppercase tracking-[0.25em] text-white/70 sm:text-sm">
            Our memories
          </p>
        </div>

        {/* Back button */}
        <a
          href="/"
          className="absolute left-5 top-5 z-20 text-[10px] font-medium uppercase tracking-[0.25em] text-white/80 transition hover:text-white sm:left-10 sm:top-8"
        >
          ← Our Home
        </a>

        {/* Scroll indicator */}
        <div className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2 text-[9px] uppercase tracking-[0.3em] text-white/60">
          <span>Scroll</span>
          <span className="text-sm">↓</span>
        </div>
      </section>

      {/* ================================================================ */}
      {/* CONTENT                                                          */}
      {/* ================================================================ */}

      <section className="px-5 pb-20 pt-16 sm:px-10 sm:pb-32 sm:pt-24">
        <div className="mx-auto max-w-6xl">

          {/* Loading */}
          {loading && (
            <div className="flex min-h-[35vh] items-center justify-center text-center">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#81766d]">
                Looking through our memories...
              </p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex min-h-[35vh] flex-col items-center justify-center text-center">
              <p className="font-serif text-2xl text-[#8b4b3f]">
                Something went wrong.
              </p>

              <p className="mt-3 text-sm text-[#81766d]">
                {error}
              </p>
            </div>
          )}

          {/* No memories */}
          {!loading && !error && memories.length === 0 && (
            <div className="flex min-h-[40vh] flex-col items-center justify-center py-24 text-center sm:py-32">

              <div className="font-serif text-5xl text-[#5d3928]/30">
                ♡
              </div>

              <h2 className="mt-7 text-center font-serif text-3xl sm:text-4xl">
                Nothing happened today.
              </h2>

              <p className="mx-auto mt-4 max-w-md text-center text-sm leading-7 text-[#81766d]">
                No memories were saved for this day.
                <br />
                Maybe today is waiting to become one.
              </p>
            </div>
          )}

          {/* Memories */}
          {!loading && !error && memories.length > 0 && (
            <div className="space-y-8">

              {memories.map((memory) => (
                <article
                  key={memory.id}
                  className="overflow-hidden rounded-md bg-[#ebe4da]"
                >
                  <div className="grid md:grid-cols-[1fr_1fr]">

                    {/* Text */}
                    <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">

                      <p className="text-[9px] uppercase tracking-[0.28em] text-[#8b4b3f]">
                        {new Date(
                          `${memory.date}T00:00:00`
                        ).getFullYear()}
                      </p>

                      <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
                        {memory.title}
                      </h2>

                      {memory.description && (
                        <p className="mt-5 max-w-lg text-sm leading-7 text-[#81766d]">
                          {memory.description}
                        </p>
                      )}

                      {memory.location && (
                        <p className="mt-6 text-[9px] uppercase tracking-[0.2em] text-[#81766d]">
                          {memory.location}
                        </p>
                      )}
                    </div>

                    {/* Media */}
                    <div className="bg-[#ddd4ca]">

                      {memory.media.length > 0 ? (
                        <div
                          className={`grid ${
                            memory.media.length === 1
                              ? "grid-cols-1"
                              : "grid-cols-2"
                          }`}
                        >
                          {memory.media.map((url, index) => (
                            <div
                              key={`${memory.id}-${index}`}
                              className="relative aspect-square overflow-hidden"
                            >
                              <Image
                                src={url}
                                alt={memory.title}
                                fill
                                sizes="(max-width: 768px) 50vw, 25vw"
                                className="object-cover transition duration-700 hover:scale-105"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex aspect-[4/3] items-center justify-center">
                          <span className="font-serif text-4xl text-[#5d3928]/20">
                            ♡
                          </span>
                        </div>
                      )}

                    </div>
                  </div>
                </article>
              ))}

            </div>
          )}

        </div>
      </section>

      {/* ================================================================ */}
      {/* FOOTER                                                           */}
      {/* ================================================================ */}

      <footer className="border-t border-black/[0.06] px-5 py-12 text-center sm:px-10">
        <p className="text-[9px] uppercase tracking-[0.3em] text-[#81766d]">
          Just ours ♡
        </p>
      </footer>

    </main>
  );
}