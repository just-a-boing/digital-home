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
  const [allTodayMemories, setAllTodayMemories] = useState<Memory[]>([]);
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

      year: date.getFullYear(),
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

      setAllTodayMemories(matchingMemories);

      /*
       * Current memories shown in the main section.
       * All memories are kept available for the
       * "More from this day" section below.
       */
      setMemories(matchingMemories);

      setLoading(false);
    };

    loadTodayMemories();
  }, [today.day, today.month]);

  /*
   * Get one representative memory for each year.
   *
   * Example:
   * 2026 → first memory from 2026
   * 2025 → first memory from 2025
   * 2024 → first memory from 2024
   */
  const memoriesByYear = useMemo(() => {
    const grouped = new Map<number, Memory>();

    allTodayMemories.forEach((memory) => {
      const year = new Date(
        `${memory.date}T00:00:00`
      ).getFullYear();

      if (!grouped.has(year)) {
        grouped.set(year, memory);
      }
    });

    return Array.from(grouped.entries())
      .sort((a, b) => b[0] - a[0]);
  }, [allTodayMemories]);

  /*
   * Years other than the current year.
   *
   * These are what appear under:
   * "More from this day"
   */
  const previousYears = useMemo(() => {
    return memoriesByYear.filter(
      ([year]) => year !== today.year
    );
  }, [memoriesByYear, today.year]);

  return (
    <main className="min-h-[100svh] bg-[#f4f0ea] text-[#28231f]">

      {/* ================================================================ */}
      {/* HERO                                                             */}
      {/* ================================================================ */}

      <section className="relative h-[55svh] min-h-[420px] w-full overflow-hidden sm:h-[60svh] sm:min-h-[500px]">

        <Image
          src={clock}
          alt="Today"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-black/30" />

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

        <a
          href="/"
          className="absolute left-5 top-5 z-20 text-[10px] font-medium uppercase tracking-[0.25em] text-white/80 transition hover:text-white sm:left-10 sm:top-8"
        >
          ← Our Home
        </a>

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

          {/* ============================================================ */}
          {/* NO MEMORIES                                                   */}
          {/* ============================================================ */}

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

          {/* ============================================================ */}
          {/* MEMORIES                                                      */}
          {/* ============================================================ */}

          {!loading && !error && memories.length > 0 && (
            <>
              <div className="space-y-8">

                {memories.map((memory) => (
                  <article
                    key={memory.id}
                    className="overflow-hidden rounded-md bg-[#ebe4da]"
                  >

                    {/* -------------------------------------------------- */}
                    {/* Memory header                                      */}
                    {/* -------------------------------------------------- */}

                    <div className="px-6 pt-8 text-center sm:px-10 sm:pt-10">

                      <a
                        href="/memories"
                        className="text-[9px] uppercase tracking-[0.25em] text-[#81766d] transition hover:text-[#28231f]"
                      >
                        ← Back to all memories
                      </a>

                      <p className="mt-8 text-[9px] uppercase tracking-[0.28em] text-[#8b4b3f]">
                        {new Date(
                          `${memory.date}T00:00:00`
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>

                      <h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">
                        {memory.title}
                      </h2>

                      {memory.description && (
                        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#81766d]">
                          {memory.description}
                        </p>
                      )}

                      {/* Metadata */}
                      <div className="mt-7 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[9px] uppercase tracking-[0.18em] text-[#81766d]">

                        <span>
                          ♡{" "}
                          {new Date(
                            `${memory.date}T00:00:00`
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>

                        {memory.location && (
                          <span>
                            ◉ {memory.location}
                          </span>
                        )}

                        <span>
                          ♡ A perfect memory
                        </span>

                      </div>
                    </div>

                    {/* -------------------------------------------------- */}
                    {/* Main media                                          */}
                    {/* -------------------------------------------------- */}

                    <div className="px-3 pb-3 pt-6 sm:px-6 sm:pt-7">

                      {memory.media.length > 0 ? (
                        <>

                          {/* Main image */}
                          <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-[#ddd4ca]">
                            <Image
                              src={memory.media[0]}
                              alt={memory.title}
                              fill
                              sizes="(max-width: 768px) 100vw, 1100px"
                              className="object-cover transition duration-700 hover:scale-[1.02]"
                            />
                          </div>

                          {/* Thumbnail row */}
                          {memory.media.length > 1 && (
                            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">

                              {memory.media
                                .slice(1, 5)
                                .map((url, index) => (
                                  <div
                                    key={`${memory.id}-thumb-${index}`}
                                    className="relative aspect-[4/3] overflow-hidden rounded-md bg-[#ddd4ca]"
                                  >
                                    <Image
                                      src={url}
                                      alt={`${memory.title} ${index + 2}`}
                                      fill
                                      sizes="(max-width: 768px) 25vw, 250px"
                                      className="object-cover transition duration-500 hover:scale-105"
                                    />

                                    {/* Small heart overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-2xl text-white drop-shadow-md">
                                        ♡
                                      </span>
                                    </div>
                                  </div>
                                ))}

                            </div>
                          )}

                        </>
                      ) : (
                        <div className="flex aspect-[16/9] items-center justify-center rounded-lg bg-[#ddd4ca]">
                          <span className="font-serif text-5xl text-[#5d3928]/20">
                            ♡
                          </span>
                        </div>
                      )}

                    </div>

                    {/* -------------------------------------------------- */}
                    {/* Description                                         */}
                    {/* -------------------------------------------------- */}

                    {memory.description && (
                      <div className="px-7 pb-8 pt-6 text-center sm:px-14 sm:pb-10">

                        <p className="mx-auto max-w-2xl font-serif text-sm leading-7 text-[#81766d] sm:text-base">
                          {memory.description}
                        </p>

                      </div>
                    )}

                  </article>
                ))}

              </div>

              {/* ======================================================== */}
              {/* MORE FROM THIS DAY                                      */}
              {/* ======================================================== */}

              {previousYears.length > 0 && (
                <section className="mt-20 border-t border-black/[0.07] pt-12 sm:mt-24 sm:pt-14">

                  <div className="text-center">

                    <p className="text-[9px] uppercase tracking-[0.3em] text-[#81766d]">
                      Same day, different years
                    </p>

                    <h2 className="mt-3 font-serif text-2xl sm:text-3xl">
                      More from this day
                    </h2>

                  </div>

                  <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

                    {previousYears.map(([year, memory]) => (
                      <a
                        key={year}
                        href={`/memories/${memory.id}`}
                        className="group relative overflow-hidden rounded-md bg-[#ddd4ca]"
                      >

                        {/* Image */}
                        <div className="relative aspect-[16/9]">

                          {memory.media.length > 0 ? (
                            <Image
                              src={memory.media[0]}
                              alt={`${year} memory`}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover transition duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <Image
                              src={clock}
                              alt={`${year} memory`}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover transition duration-700 group-hover:scale-105"
                            />
                          )}

                          {/* Overlay */}
                          <div className="absolute inset-0 bg-black/25 transition group-hover:bg-black/35" />

                          {/* Year */}
                          <div className="absolute inset-0 flex items-center justify-center">

                            <span className="font-serif text-3xl text-white drop-shadow-lg sm:text-4xl">
                              {year}
                            </span>

                          </div>

                        </div>

                        {/* Bottom information */}
                        <div className="bg-[#ebe4da] px-4 py-4">

                          <p className="font-serif text-lg">
                            {memory.title}
                          </p>

                          <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-[#81766d]">
                            {today.formatted} · {year}
                          </p>

                        </div>

                      </a>
                    ))}

                  </div>
                </section>
              )}

            </>
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
