"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

import clock from "@/assets/year.jpg";

// ============================================================================
// TYPES
// ============================================================================

type Memory = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  media: unknown;
};

type SignedMedia = {
  path: string;
  signedUrl: string;
  type: "image" | "video";
};

type MemoryWithMedia = Omit<Memory, "media"> & {
  media: string[];
  signedMedia: SignedMedia[];
};

// ============================================================================
// PAGE
// ============================================================================

export default function TodayPage() {
  const [memories, setMemories] = useState<MemoryWithMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // TODAY
  // ==========================================================================

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

  // ==========================================================================
  // MEDIA TYPE
  // ==========================================================================

  const getMediaType = (
    path: string
  ): "image" | "video" => {
    const cleanPath = path
      .split("?")[0]
      .split("#")[0];

    const extension = cleanPath
      .split(".")
      .pop()
      ?.toLowerCase();

    const videoExtensions = [
      "mp4",
      "webm",
      "mov",
      "m4v",
      "avi",
      "mkv",
      "ogg",
    ];

    return extension &&
      videoExtensions.includes(extension)
      ? "video"
      : "image";
  };

  // ==========================================================================
  // STORAGE URL -> STORAGE PATH
  // ==========================================================================

  const getStoragePath = (value: string): string => {
    const cleanValue = value.trim();

    if (!cleanValue) {
      return "";
    }

    if (!cleanValue.startsWith("http")) {
      return cleanValue;
    }

    try {
      const url = new URL(cleanValue);

      const marker = "/storage/v1/object/";
      const markerIndex = url.pathname.indexOf(marker);

      if (markerIndex === -1) {
        return cleanValue;
      }

      let path = url.pathname.substring(
        markerIndex + marker.length
      );

      path = path.replace(/^public\//, "");
      path = path.replace(/^sign\//, "");
      path = path.replace(/^authenticated\//, "");

      if (path.startsWith("media/")) {
        path = path.substring("media/".length);
      }

      return decodeURIComponent(path);
    } catch {
      return cleanValue;
    }
  };

  // ==========================================================================
  // EXTRACT MEDIA PATHS
  // ==========================================================================

  const extractMediaPaths = (value: unknown): string[] => {
    if (value === null || value === undefined) {
      return [];
    }

    // ARRAY
    if (Array.isArray(value)) {
      return value
        .flatMap((item) => extractMediaPaths(item))
        .filter(Boolean);
    }

    // STRING
    if (typeof value === "string") {
      const cleanValue = value.trim();

      if (!cleanValue) {
        return [];
      }

      // JSON array
      if (
        cleanValue.startsWith("[") &&
        cleanValue.endsWith("]")
      ) {
        try {
          const parsed = JSON.parse(cleanValue);

          return extractMediaPaths(parsed);
        } catch {
          // Continue below.
        }
      }

      // PostgreSQL array
      if (
        cleanValue.startsWith("{") &&
        cleanValue.endsWith("}")
      ) {
        const inside = cleanValue.slice(1, -1);

        if (!inside.trim()) {
          return [];
        }

        return inside
          .split(",")
          .map((item) =>
            item
              .trim()
              .replace(/^"(.*)"$/, "$1")
              .replace(/\\"/g, '"')
          )
          .filter(Boolean);
      }

      // Full Supabase URL
      if (cleanValue.startsWith("http")) {
        const path = getStoragePath(cleanValue);

        return path ? [path] : [];
      }

      // Normal storage path
      return [cleanValue];
    }

    return [];
  };

  // ==========================================================================
  // CREATE SIGNED URLS
  // ==========================================================================

  const createSignedUrls = async (
    storagePaths: string[]
  ): Promise<Record<string, string>> => {
    if (storagePaths.length === 0) {
      return {};
    }

    const cleanPaths = storagePaths
      .map((path) => getStoragePath(path))
      .filter(Boolean);

    if (cleanPaths.length === 0) {
      return {};
    }

    const { data, error } = await supabase.storage
      .from("media")
      .createSignedUrls(cleanPaths, 60 * 60 * 24);

    if (error) {
      console.error(
        "Failed to create signed URLs:",
        error
      );

      return {};
    }

    const result: Record<string, string> = {};

    for (const item of data ?? []) {
      if (item.path && item.signedUrl) {
        result[item.path] = item.signedUrl;
      }
    }

    return result;
  };

  // ==========================================================================
  // LOAD TODAY'S MEMORIES
  // ==========================================================================

  useEffect(() => {
    let mounted = true;

    const loadTodayMemories = async () => {
      setLoading(true);
      setError(null);

      try {
        // --------------------------------------------------------------------
        // AUTH
        // --------------------------------------------------------------------

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          window.location.replace("/login");
          return;
        }

        // --------------------------------------------------------------------
        // GET MEMORIES
        // --------------------------------------------------------------------

        const { data, error: databaseError } =
          await supabase
            .from("memories")
            .select(
              "id, title, description, date, location, media"
            )
            .order("date", {
              ascending: false,
            });

        if (databaseError) {
          throw databaseError;
        }

        // --------------------------------------------------------------------
        // FILTER BY MONTH + DAY
        // --------------------------------------------------------------------

        const matchingMemories = (data ?? []).filter(
          (memory) => {
            const [, month, day] = memory.date
              .split("-")
              .map(Number);

            return (
              month === today.month &&
              day === today.day
            );
          }
        );

        // --------------------------------------------------------------------
        // CREATE SIGNED MEDIA
        // --------------------------------------------------------------------

        const loadedMemories: MemoryWithMedia[] = [];

        for (const memory of matchingMemories) {
          const mediaPaths = extractMediaPaths(
            memory.media
          );

          const cleanPaths = mediaPaths
            .map((path) => getStoragePath(path))
            .filter(Boolean);

          const signedUrls = await createSignedUrls(
            cleanPaths
          );

          const signedMedia: SignedMedia[] =
            cleanPaths
              .map((path) => {
                const signedUrl = signedUrls[path];

                if (!signedUrl) {
                  return null;
                }

                return {
                  path,
                  signedUrl,
                  type: getMediaType(path),
                };
              })
              .filter(
                (
                  item
                ): item is SignedMedia =>
                  item !== null
              );

          loadedMemories.push({
            id: memory.id,
            title: memory.title,
            description: memory.description,
            date: memory.date,
            location: memory.location,
            media: mediaPaths,
            signedMedia,
          });
        }

        if (mounted) {
          setMemories(loadedMemories);
        }
      } catch (error) {
        console.error(
          "Failed to load today's memories:",
          error
        );

        if (mounted) {
          setError(
            "Unable to load today's memories."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTodayMemories();

    return () => {
      mounted = false;
    };
  }, [today.day, today.month]);

  // ==========================================================================
  // DATE FORMAT
  // ==========================================================================

  const formatDate = (date: string) => {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // ==========================================================================
  // PAGE
  // ==========================================================================

  return (
    <main className="min-h-[100svh] bg-[#f4f0ea] text-[#28231f]">

      {/* ================================================================== */}
      {/* HERO                                                              */}
      {/* ================================================================== */}

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

        {/* HOME */}

        <a
          href="/"
          className="absolute left-5 top-5 z-20 text-[10px] font-medium uppercase tracking-[0.25em] text-white/80 transition hover:text-white sm:left-10 sm:top-8"
        >
          ← Our Home
        </a>

        {/* HERO TEXT */}

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">

          <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.35em] text-white/80 sm:text-xs">
            On this day
          </p>

          <h1 className="font-serif text-5xl leading-none tracking-tight sm:text-7xl md:text-8xl">
            {today.formatted}
          </h1>

          <div className="mt-7 h-px w-12 bg-white/70" />

          <p className="mt-6 text-xs font-medium uppercase tracking-[0.25em] text-white/70 sm:text-sm">
            Our memories
          </p>
        </div>

        {/* SCROLL */}

        <div className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2 text-[9px] uppercase tracking-[0.3em] text-white/60">
          <span>Scroll</span>
          <span className="text-sm">↓</span>
        </div>

      </section>

      {/* ================================================================== */}
      {/* CONTENT                                                            */}
      {/* ================================================================== */}

      <section className="px-5 pb-24 pt-16 sm:px-10 sm:pb-36 sm:pt-24">

        <div className="mx-auto w-full max-w-5xl">

          {/* ================================================================= */}
          {/* INTRO                                                             */}
          {/* ================================================================= */}

          <div className="mx-auto mb-16 w-full max-w-2xl text-center sm:mb-20">

            <p className="text-[9px] uppercase tracking-[0.3em] text-[#8b4b3f]">
              A little piece of our story
            </p>

            <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
              {memories.length > 0
                ? "Remember when?"
                : "Nothing happened today."}
            </h2>

            {memories.length > 0 && (
              <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[#81766d]">
                Moments from this day,
                across the years.
              </p>
            )}

          </div>

          {/* ================================================================= */}
          {/* LOADING                                                           */}
          {/* ================================================================= */}

          {loading && (
            <div className="flex min-h-[35vh] items-center justify-center text-center">

              <p className="text-[10px] uppercase tracking-[0.3em] text-[#81766d]">
                Looking through our memories...
              </p>

            </div>
          )}

          {/* ================================================================= */}
          {/* ERROR                                                             */}
          {/* ================================================================= */}

          {!loading && error && (
            <div className="mx-auto flex min-h-[35vh] max-w-lg flex-col items-center justify-center text-center">

              <div className="font-serif text-5xl text-[#5d3928]/25">
                ♡
              </div>

              <h2 className="mt-6 font-serif text-3xl">
                Something went wrong.
              </h2>

              <p className="mt-3 text-sm leading-7 text-[#81766d]">
                {error}
              </p>

            </div>
          )}

          {/* ================================================================= */}
          {/* EMPTY                                                             */}
          {/* ================================================================= */}

          {!loading &&
            !error &&
            memories.length === 0 && (
              <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center pb-16 text-center">

                <div className="font-serif text-6xl text-[#5d3928]/20">
                  ♡
                </div>

                <h2 className="mt-7 font-serif text-3xl leading-tight sm:text-4xl">
                  Nothing happened today.
                </h2>

                <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#81766d]">
                  No memories were saved for
                  this day.
                  <br />
                  Maybe today is waiting to
                  become one.
                </p>

              </div>
            )}

          {/* ================================================================= */}
          {/* MEMORIES                                                          */}
          {/* ================================================================= */}

          {!loading &&
            !error &&
            memories.length > 0 && (
              <div className="w-full space-y-24 sm:space-y-32">

                {memories.map((memory) => (
                  <article
                    key={memory.id}
                    className="w-full"
                  >

                    {/* ===================================================== */}
                    {/* MEMORY TEXT                                            */}
                    {/* ===================================================== */}

                    <div className="mx-auto w-full max-w-3xl text-center">

                      {/* DATE */}

                      <p className="text-[9px] font-medium uppercase tracking-[0.28em] text-[#8b4b3f]">
                        {formatDate(memory.date)}
                      </p>

                      {/* TITLE + LOCATION */}

                      <div className="mt-5 px-2 text-center">

                        <h2 className="font-serif text-3xl leading-[1.15] sm:text-5xl">
                          {memory.title}
                        </h2>

                        {memory.location && (
                          <p className="mt-3 text-[9px] uppercase tracking-[0.22em] text-[#81766d]">
                            ◉ {memory.location}
                          </p>
                        )}

                      </div>

                      {/* DESCRIPTION */}

                      {memory.description && (
                        <p className="mx-auto mt-6 max-w-2xl px-2 font-serif text-sm leading-7 text-[#81766d] sm:text-base">
                          {memory.description}
                        </p>
                      )}

                    </div>

                    {/* ===================================================== */}
                    {/* MEDIA                                                  */}
                    {/* ===================================================== */}

                    <div className="mx-auto mt-8 w-full max-w-5xl sm:mt-10">

                      {memory.signedMedia.length > 0 ? (
                        <>

                          {/* MAIN MEDIA */}

                          <div className="overflow-hidden rounded-lg bg-[#ddd4ca]">

                            {memory.signedMedia[0].type ===
                            "video" ? (
                              <video
                                src={
                                  memory.signedMedia[0]
                                    .signedUrl
                                }
                                controls
                                playsInline
                                preload="metadata"
                                className="mx-auto block max-h-[700px] w-full object-contain"
                              />
                            ) : (
                              <img
                                src={
                                  memory.signedMedia[0]
                                    .signedUrl
                                }
                                alt={memory.title}
                                className="mx-auto block max-h-[700px] w-full object-contain transition duration-700 hover:scale-[1.01]"
                              />
                            )}

                          </div>

                          {/* ================================================= */}
                          {/* THUMBNAILS                                        */}
                          {/* ================================================= */}

                          {memory.signedMedia.length > 1 && (
                            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">

                              {memory.signedMedia
                                .slice(1)
                                .map(
                                  (media, index) => (
                                    <div
                                      key={`${memory.id}-media-${index + 1}`}
                                      className="group relative aspect-[4/3] overflow-hidden rounded-md bg-[#ddd4ca]"
                                    >

                                      {media.type ===
                                      "video" ? (
                                        <video
                                          src={
                                            media.signedUrl
                                          }
                                          muted
                                          playsInline
                                          preload="metadata"
                                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                        />
                                      ) : (
                                        <img
                                          src={
                                            media.signedUrl
                                          }
                                          alt={`${memory.title} ${
                                            index +
                                            2
                                          }`}
                                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                        />
                                      )}

                                      {/* VIDEO */}

                                      {media.type ===
                                        "video" && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-sm text-white backdrop-blur-sm">
                                            ▶
                                          </span>
                                        </div>
                                      )}

                                      {/* HEART */}

                                      {media.type ===
                                        "image" && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition duration-300 group-hover:opacity-100">
                                          <span className="text-2xl text-white drop-shadow-lg">
                                            ♡
                                          </span>
                                        </div>
                                      )}

                                    </div>
                                  )
                                )}

                            </div>
                          )}

                        </>
                      ) : (
                        /* NO MEDIA */

                        <div className="flex aspect-[16/9] items-center justify-center rounded-lg bg-[#ddd4ca]">

                          <span className="font-serif text-6xl text-[#5d3928]/20">
                            ♡
                          </span>

                        </div>
                      )}

                    </div>

                  </article>
                ))}

              </div>
            )}

        </div>

      </section>

      {/* ================================================================== */}
      {/* FOOTER                                                             */}
      {/* ================================================================== */}

      <footer className="border-t border-black/[0.06] px-5 py-12 text-center sm:px-10">

        <p className="text-[9px] uppercase tracking-[0.3em] text-[#81766d]">
          Just ours ♡
        </p>

      </footer>

    </main>
  );
}
