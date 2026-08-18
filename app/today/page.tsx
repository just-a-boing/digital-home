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

  /* ================================================================ */
  /* TODAY                                                            */
  /* ================================================================ */

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

  /* ================================================================ */
  /* LOAD TODAY'S MEMORIES                                            */
  /* ================================================================ */

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

        {/* Overlay */}
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

      <section className="px-4 pb-24 pt-14 sm:px-8 sm:pb-32 sm:pt-20">
        <div className="mx-auto max-w-4xl">

          {/* ============================================================ */}
          {/* LOADING                                                       */}
          {/* ============================================================ */}

          {loading && (
            <div className="flex min-h-[35vh] items-center justify-center text-center">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#81766d]">
                Looking through our memories...
              </p>
            </div>
          )}

          {/* ============================================================ */}
          {/* ERROR                                                         */}
          {/* ============================================================ */}

          {!loading && error && (
            <div className="flex min-h-[35vh] flex-col items-center justify-center text-center">

              <div className="font-serif text-5xl text-[#8b4b3f]/30">
                ♡
              </div>

              <p className="mt-6 font-serif text-2xl text-[#8b4b3f]">
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

              <div className="font-serif text-6xl text-[#5d3928]/25">
                ♡
              </div>

              <h2 className="mt-7 font-serif text-3xl sm:text-4xl">
                Nothing happened today.
              </h2>

              <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#81766d]">
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
            <div className="space-y-24">

              {memories.map((memory) => {
                const memoryDate = new Date(
                  `${memory.date}T00:00:00`
                );

                const year = memoryDate.getFullYear();

                const formattedDate =
                  memoryDate.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  });

                const media = memory.media ?? [];

                const mainImage = media[0];

                const thumbnails = media.slice(1);

                return (
                  <article
                    key={memory.id}
                    className="mx-auto max-w-3xl"
                  >

                    {/* ================================================== */}
                    {/* MEMORY HEADER                                      */}
                    {/* ================================================== */}

                    <div className="text-center">

                      {/* Top navigation */}
                      <div className="mb-10 flex items-center justify-between">

                        <a
                          href="/today"
                          className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#81766d] transition hover:text-[#28231f]"
                        >
                          ← Back to today
                        </a>

                        <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#81766d]">
                          {year}
                        </span>

                      </div>

                      {/* Title */}
                      <h2 className="font-serif text-4xl leading-tight tracking-[-0.02em] sm:text-5xl md:text-6xl">
                        {memory.title}
                      </h2>

                      {/* Decorative line */}
                      <div className="mx-auto mt-6 h-px w-10 bg-[#8b4b3f]/50" />

                      {/* Metadata */}
                      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">

                        <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.15em] text-[#81766d]">
                          <span className="text-sm">
                            ▣
                          </span>

                          {formattedDate}
                        </span>

                        {memory.location && (
                          <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.15em] text-[#81766d]">
                            <span className="text-sm">
                              ♧
                            </span>

                            {memory.location}
                          </span>
                        )}

                        <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.15em] text-[#81766d]">
                          <span className="text-sm">
                            ♡
                          </span>

                          A perfect moment
                        </span>

                      </div>

                    </div>

                    {/* ================================================== */}
                    {/* MAIN IMAGE                                         */}
                    {/* ================================================== */}

                    {mainImage ? (
                      <div className="mt-9 overflow-hidden rounded-lg bg-[#ddd4ca] shadow-[0_15px_45px_rgba(50,35,25,0.10)]">

                        <div className="relative aspect-[16/10] w-full">

                          <Image
                            src={mainImage}
                            alt={memory.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 768px"
                            className="object-cover transition duration-700 hover:scale-[1.015]"
                          />

                        </div>

                      </div>
                    ) : (
                      <div className="mt-9 flex aspect-[16/10] items-center justify-center rounded-lg bg-[#ddd4ca]">

                        <span className="font-serif text-6xl text-[#5d3928]/20">
                          ♡
                        </span>

                      </div>
                    )}

                    {/* ================================================== */}
                    {/* IMAGE THUMBNAILS                                   */}
                    {/* ================================================== */}

                    {thumbnails.length > 0 && (
                      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">

                        {thumbnails.map((url, index) => (
                          <div
                            key={`${memory.id}-${index}`}
                            className="relative aspect-[4/3] overflow-hidden rounded-md bg-[#ddd4ca]"
                          >

                            <Image
                              src={url}
                              alt={`${memory.title} photo ${
                                index + 2
                              }`}
                              fill
                              sizes="(max-width: 640px) 33vw, 180px"
                              className="object-cover transition duration-500 hover:scale-105"
                            />

                          </div>
                        ))}

                      </div>
                    )}

                    {/* ================================================== */}
                    {/* DESCRIPTION                                         */}
                    {/* ================================================== */}

                    {memory.description && (
                      <div className="mx-auto mt-10 max-w-2xl text-center">

                        <div className="mb-6 font-serif text-xl text-[#8b4b3f]/40">
                          ♡
                        </div>

                        <p className="whitespace-pre-line font-serif text-base leading-8 text-[#4c433d] sm:text-lg">
                          {memory.description}
                        </p>

                      </div>
                    )}

                    {/* ================================================== */}
                    {/* BOTTOM ACTIONS                                     */}
                    {/* ================================================== */}

                    <div className="mt-12 flex items-center justify-between border-t border-black/[0.07] pt-6">

                      {/* Share */}
                      <button
                        type="button"
                        onClick={async () => {
                          if (navigator.share) {
                            await navigator.share({
                              title: memory.title,
                              text:
                                memory.description ??
                                memory.title,
                              url: window.location.href,
                            });
                          }
                        }}
                        className="text-[9px] uppercase tracking-[0.2em] text-[#81766d] transition hover:text-[#28231f]"
                      >
                        ♧ &nbsp; Share
                      </button>

                      {/* Right side */}
                      <div className="flex items-center gap-5">

                        <a
                          href={`/memories?edit=${memory.id}`}
                          className="text-[9px] uppercase tracking-[0.2em] text-[#81766d] transition hover:text-[#28231f]"
                        >
                          ✎ &nbsp; Edit
                        </a>

                        <button
                          type="button"
                          className="text-[9px] uppercase tracking-[0.2em] text-[#81766d] transition hover:text-[#8b4b3f]"
                        >
                          ♢ &nbsp; Delete
                        </button>

                      </div>

                    </div>

                  </article>
                );
              })}

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
