"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

import memoriesImage from "@/assets/memories.png";

type Memory = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  media: string[];
};

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMemories = async () => {
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
        setError("Unable to load our memories.");
        setLoading(false);
        return;
      }

      setMemories(data ?? []);
      setLoading(false);
    };

    loadMemories();
  }, []);

  /*
   * Group memories by year.
   *
   * Example:
   *
   * 2026
   *   memory
   *   memory
   *
   * 2025
   *   memory
   *   memory
   */
  const memoriesByYear = useMemo(() => {
    const groups: Record<string, Memory[]> = {};

    memories.forEach((memory) => {
      const year = memory.date.slice(0, 4);

      if (!groups[year]) {
        groups[year] = [];
      }

      groups[year].push(memory);
    });

    return groups;
  }, [memories]);

  const years = Object.keys(memoriesByYear).sort(
    (a, b) => Number(b) - Number(a)
  );

  const formatDate = (date: string) => {
    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "en-US",
      {
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    );
  };

  const formatShortDate = (date: string) => {
    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
      }
    );
  };

  return (
    <main className="min-h-[100svh] bg-[#f4f0ea] text-[#28231f]">

      {/* ================================================================ */}
      {/* HERO                                                             */}
      {/* ================================================================ */}

      <section className="relative h-[58svh] min-h-[430px] w-full overflow-hidden sm:h-[65svh] sm:min-h-[520px]">

        <Image
          src={memoriesImage}
          alt="Our memories"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        {/* Readability overlay */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Navigation */}
        <a
          href="/"
          className="absolute left-5 top-5 z-20 text-[10px] font-medium uppercase tracking-[0.25em] text-white/80 transition hover:text-white sm:left-10 sm:top-8"
        >
          ← Our Home
        </a>

        {/* Hero content */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center text-white">

          <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.35em] text-white/80 sm:text-xs">
            A collection of moments
          </p>

          <h1 className="font-serif text-6xl tracking-tight sm:text-8xl md:text-9xl">
            Our Memories
          </h1>

          <div className="mt-7 h-px w-12 bg-white/70" />

          <p className="mt-6 max-w-md text-sm leading-7 text-white/75 sm:text-base">
            Every little moment that became
            <br />
            part of our story.
          </p>
        </div>

        {/* Scroll */}
        <div className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2 text-[9px] uppercase tracking-[0.3em] text-white/60">
          <span>Scroll</span>
          <span className="text-sm">↓</span>
        </div>
      </section>

      {/* ================================================================ */}
      {/* INTRO                                                            */}
      {/* ================================================================ */}

      <section className="w-full px-5 pb-12 pt-20 sm:px-10 sm:pb-20 sm:pt-28">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">

        <p className="text-center text-[10px] uppercase tracking-[0.3em] text-[#8b4b3f]">
            Our story
        </p>

        <h2 className="mt-4 text-center font-serif text-4xl sm:text-5xl">
            A timeline of us
        </h2>

        <p className="mx-auto mt-5 max-w-xl text-center text-sm leading-7 text-[#81766d]">
            From ordinary days to moments we never want to
            <br />
            forget.
        </p>

        </div>
      </section>

      {/* ================================================================ */}
      {/* LOADING                                                          */}
      {/* ================================================================ */}

      {loading && (
        <section className="flex min-h-[40vh] items-center justify-center px-5 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#81766d]">
            Opening our memories...
          </p>
        </section>
      )}

      {/* ================================================================ */}
      {/* ERROR                                                            */}
      {/* ================================================================ */}

      {!loading && error && (
        <section className="flex min-h-[40vh] flex-col items-center justify-center px-5 text-center">

          <div className="font-serif text-5xl text-[#5d3928]/25">
            ♡
          </div>

          <h2 className="mt-6 font-serif text-3xl">
            Something went wrong.
          </h2>

          <p className="mt-3 text-sm text-[#81766d]">
            {error}
          </p>

        </section>
      )}

      {/* ================================================================ */}
      {/* EMPTY                                                            */}
      {/* ================================================================ */}

      {!loading && !error && memories.length === 0 && (
        <section className="flex min-h-[40vh] flex-col items-center justify-center px-5 py-24 text-center">

          <div className="font-serif text-6xl text-[#5d3928]/25">
            ♡
          </div>

          <h2 className="mt-7 font-serif text-3xl sm:text-4xl">
            Our story is waiting.
          </h2>

          <p className="mt-4 max-w-md text-center text-sm leading-7 text-[#81766d]">
            There are no memories here yet.
            <br />
            Maybe the first one is waiting to be made.
          </p>

        </section>
      )}

      {/* ================================================================ */}
      {/* TIMELINE                                                         */}
      {/* ================================================================ */}

      {!loading && !error && memories.length > 0 && (
        <section className="px-5 pb-24 sm:px-10 sm:pb-36">

          <div className="mx-auto max-w-6xl">

            {/* Timeline */}
            <div className="relative">

              {/* Main vertical line */}
              <div className="absolute bottom-0 left-[13px] top-0 w-px bg-[#28231f]/10 md:left-1/2 md:-translate-x-1/2" />

              {years.map((year, yearIndex) => (
                <div key={year}>

                  {/* ================================================== */}
                  {/* YEAR MARKER                                         */}
                  {/* ================================================== */}

                  <div className="relative z-10 mb-14 flex items-center md:mb-20">

                    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#8b4b3f]/30 bg-[#f4f0ea] md:absolute md:left-1/2 md:-translate-x-1/2">
                      <div className="h-2 w-2 rounded-full bg-[#8b4b3f]" />
                    </div>

                    <div className="ml-6 md:mx-auto md:ml-0">
                      <span className="bg-[#f4f0ea] px-5 font-serif text-3xl text-[#5d3928] sm:text-4xl">
                        {year}
                      </span>
                    </div>

                  </div>

                  {/* ================================================== */}
                  {/* MEMORIES FOR YEAR                                  */}
                  {/* ================================================== */}

                  <div className="space-y-16 md:space-y-24">

                    {memoriesByYear[year].map(
                      (memory, memoryIndex) => {

                        const isEven =
                          memoryIndex % 2 === 0;

                        return (
                          <article
                            key={memory.id}
                            className="relative"
                          >

                            {/* Timeline dot */}
                            <div className="absolute left-[8px] top-8 z-10 flex h-3 w-3 items-center justify-center rounded-full bg-[#8b4b3f] ring-4 ring-[#f4f0ea] md:left-1/2 md:-translate-x-1/2" />

                            {/* Desktop connector */}
                            <div
                              className={`absolute top-8 hidden h-px w-[calc(50%-24px)] bg-[#28231f]/10 md:block ${
                                isEven
                                  ? "right-1/2 mr-3"
                                  : "left-1/2 ml-3"
                              }`}
                            />

                            {/* ================================================= */}
                            {/* MEMORY CARD                                      */}
                            {/* ================================================= */}

                            <div
                              className={`pl-12 md:w-1/2 md:pl-0 ${
                                isEven
                                  ? "md:pr-16"
                                  : "md:ml-auto md:pl-16"
                              }`}
                            >

                              <div className="overflow-hidden rounded-md bg-[#ebe4da] shadow-[0_10px_40px_rgba(40,35,31,0.05)]">

                                {/* Media */}
                                {memory.media.length > 0 && (
                                  <div
                                    className={`grid ${
                                      memory.media.length === 1
                                        ? "grid-cols-1"
                                        : "grid-cols-2"
                                    }`}
                                  >
                                    {memory.media.map(
                                      (url, index) => (
                                        <div
                                          key={`${memory.id}-${index}`}
                                          className="relative aspect-[4/3] overflow-hidden bg-[#ddd4ca]"
                                        >
                                          <img
                                            src={url}
                                            alt={`${memory.title} ${
                                              index + 1
                                            }`}
                                            className="absolute inset-0 h-full w-full object-cover transition duration-700 hover:scale-105"
                                          />
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}

                                {/* Text */}
                                <div className="p-6 sm:p-8">

                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">

                                    <p className="text-[9px] font-medium uppercase tracking-[0.25em] text-[#8b4b3f]">
                                      {formatShortDate(
                                        memory.date
                                      )}
                                    </p>

                                    {memory.location && (
                                      <>
                                        <span className="h-1 w-1 rounded-full bg-[#81766d]/40" />

                                        <p className="text-[9px] uppercase tracking-[0.2em] text-[#81766d]">
                                          {memory.location}
                                        </p>
                                      </>
                                    )}

                                  </div>

                                  <h3 className="mt-4 font-serif text-2xl leading-tight sm:text-3xl">
                                    {memory.title}
                                  </h3>

                                  {memory.description && (
                                    <p className="mt-4 text-sm leading-7 text-[#81766d]">
                                      {memory.description}
                                    </p>
                                  )}

                                  <p className="mt-6 text-[9px] uppercase tracking-[0.2em] text-[#81766d]/60">
                                    {formatDate(memory.date)}
                                  </p>

                                </div>

                              </div>

                            </div>

                          </article>
                        );
                      }
                    )}

                  </div>

                  {/* Space between years */}
                  {yearIndex < years.length - 1 && (
                    <div className="h-24 md:h-36" />
                  )}

                </div>
              ))}

            </div>

          </div>
        </section>
      )}

    {/* ================================================================ */}
    {/* ADD MEMORY                                                       */}
    {/* ================================================================ */}

    <section className="px-5 pb-20 pt-4 sm:px-10 sm:pb-28">
    <div className="mx-auto flex max-w-6xl justify-center">
        <a
        href="/memories/add"
        className="add-memory-button group"
        >
        <span>Add a memory</span>

        <span className="add-memory-arrow">
            →
        </span>
        </a>
    </div>
    </section>

      {/* ================================================================ */}
      {/* FOOTER                                                           */}
      {/* ================================================================ */}

      <footer className="border-t border-black/[0.06] px-5 py-12 text-center sm:px-10">

        <p className="text-[9px] uppercase tracking-[0.3em] text-[#81766d]">
          Every moment matters ♡
        </p>

      </footer>

    </main>
  );
}