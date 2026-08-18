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

type SignedMedia = {
  path: string;
  signedUrl: string;
  type: "image" | "video";
};

type MemoryWithMedia = Memory & {
  signedMedia: SignedMedia[];
};

type SelectedMedia = {
  file: File;
  type: "image" | "video";
};

export default function MemoriesPage() {
  const [memories, setMemories] = useState<
    MemoryWithMedia[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  // ================================================================
  // ADD MEMORY MODAL
  // ================================================================

  const [showAddForm, setShowAddForm] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [saveProgress, setSaveProgress] =
    useState(0);

  const [saveError, setSaveError] =
    useState<string | null>(null);

  // ================================================================
  // MEMORY FORM
  // ================================================================

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [date, setDate] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [selectedMedia, setSelectedMedia] =
    useState<SelectedMedia[]>([]);

  // ================================================================
  // GET MEDIA TYPE
  // ================================================================

  const getMediaType = (
    path: string
  ): "image" | "video" => {
    const extension =
      path
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
    ];

    if (
      extension &&
      videoExtensions.includes(extension)
    ) {
      return "video";
    }

    return "image";
  };

  // ================================================================
  // SIGNED URL
  // ================================================================

  const createSignedUrl = async (
    path: string
  ): Promise<string | null> => {
    const cleanPath =
      path.trim();

    if (!cleanPath) {
      return null;
    }

    const {
      data,
      error,
    } = await supabase.storage
      .from("media")
      .createSignedUrl(
        cleanPath,
        60 * 60
      );

    if (error) {
      console.error(
        "Failed to create signed URL:",
        {
          path: cleanPath,
          error,
        }
      );

      return null;
    }

    return (
      data?.signedUrl ?? null
    );
  };

  // ================================================================
  // LOAD MEMORIES
  // ================================================================

  useEffect(() => {
    let mounted = true;

    const loadMemories = async () => {
      setLoading(true);
      setError(null);

      try {
        // ----------------------------------------------------------
        // AUTH
        // ----------------------------------------------------------

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          window.location.replace(
            "/login"
          );
          return;
        }

        // ----------------------------------------------------------
        // DATABASE
        // ----------------------------------------------------------

        const {
          data,
          error: databaseError,
        } = await supabase
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

        if (!mounted) {
          return;
        }

        // ----------------------------------------------------------
        // SIGN MEDIA
        // ----------------------------------------------------------

        const loadedMemories: MemoryWithMedia[] =
          [];

        for (const memory of data ?? []) {
          const signedMedia: SignedMedia[] =
            [];

          for (const path of memory.media ??
            []) {
            const signedUrl =
              await createSignedUrl(
                path
              );

            if (!signedUrl) {
              continue;
            }

            signedMedia.push({
              path,
              signedUrl,
              type: getMediaType(path),
            });
          }

          loadedMemories.push({
            ...memory,
            signedMedia,
          });
        }

        if (mounted) {
          setMemories(
            loadedMemories
          );
        }
      } catch (error) {
        console.error(
          "Failed to load memories:",
          error
        );

        if (mounted) {
          setError(
            "Unable to load our memories."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadMemories();

    return () => {
      mounted = false;
    };
  }, []);

  // ================================================================
  // GROUP BY YEAR
  // ================================================================

  const memoriesByYear = useMemo(() => {
    const groups: Record<
      string,
      MemoryWithMedia[]
    > = {};

    memories.forEach((memory) => {
      const year =
        memory.date.slice(0, 4);

      if (!groups[year]) {
        groups[year] = [];
      }

      groups[year].push(memory);
    });

    return groups;
  }, [memories]);

  const years = Object.keys(
    memoriesByYear
  ).sort(
    (a, b) =>
      Number(b) - Number(a)
  );

  // ================================================================
  // DATE FORMAT
  // ================================================================

  const formatDate = (
    date: string
  ) => {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString(
      "en-US",
      {
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    );
  };

  const formatShortDate = (
    date: string
  ) => {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
      }
    );
  };

  // ================================================================
  // OPEN ADD FORM
  // ================================================================

  const openAddForm = () => {
    setTitle("");
    setDescription("");
    setDate("");
    setLocation("");
    setSelectedMedia([]);
    setSaveError(null);
    setSaveProgress(0);
    setShowAddForm(true);
  };

  // ================================================================
  // CLOSE ADD FORM
  // ================================================================

  const closeAddForm = () => {
    if (saving) {
      return;
    }

    setShowAddForm(false);
    setTitle("");
    setDescription("");
    setDate("");
    setLocation("");
    setSelectedMedia([]);
    setSaveError(null);
    setSaveProgress(0);
  };

  // ================================================================
  // SELECT MEDIA
  // ================================================================

  const handleMediaSelection = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(
      event.target.files ?? []
    );

    setSaveError(null);

    if (files.length === 0) {
      return;
    }

    const newMedia: SelectedMedia[] =
      [];

    for (const file of files) {
      const isImage =
        file.type.startsWith(
          "image/"
        );

      const isVideo =
        file.type.startsWith(
          "video/"
        );

      if (!isImage && !isVideo) {
        setSaveError(
          `"${file.name}" is not a supported image or video.`
        );
        return;
      }

      // ----------------------------------------------------------
      // IMAGE LIMIT
      // ----------------------------------------------------------

      if (
        isImage &&
        file.size >
          10 * 1024 * 1024
      ) {
        setSaveError(
          `"${file.name}" is larger than 10 MB.`
        );
        return;
      }

      // ----------------------------------------------------------
      // VIDEO LIMIT
      // ----------------------------------------------------------

      if (
        isVideo &&
        file.size >
          100 * 1024 * 1024
      ) {
        setSaveError(
          `"${file.name}" is larger than 100 MB.`
        );
        return;
      }

      newMedia.push({
        file,
        type: isImage
          ? "image"
          : "video",
      });
    }

    setSelectedMedia(
      (current) => [
        ...current,
        ...newMedia,
      ]
    );

    event.target.value = "";
  };

  // ================================================================
  // REMOVE SELECTED MEDIA
  // ================================================================

  const removeSelectedMedia = (
    index: number
  ) => {
    if (saving) {
      return;
    }

    setSelectedMedia(
      (current) =>
        current.filter(
          (_, i) => i !== index
        )
    );
  };

  // ================================================================
  // UPLOAD SINGLE MEDIA
  // ================================================================

  const uploadSingleMedia = async (
    item: SelectedMedia
  ): Promise<string> => {
    const extension =
      item.file.name
        .split(".")
        .pop()
        ?.toLowerCase() ||
      (item.type === "video"
        ? "mp4"
        : "jpg");

    const fileName =
      `${crypto.randomUUID()}.${extension}`;

    const folder =
      item.type === "image"
        ? "memories/images"
        : "memories/videos";

    const filePath =
      `${folder}/${fileName}`;

    console.log(
      "Uploading memory media:",
      filePath
    );

    const {
      error: uploadError,
    } = await supabase.storage
      .from("media")
      .upload(
        filePath,
        item.file,
        {
          cacheControl: "3600",
          upsert: false,
          contentType:
            item.file.type,
        }
      );

    if (uploadError) {
      throw new Error(
        `${item.file.name}: ${uploadError.message}`
      );
    }

    return filePath;
  };

  // ================================================================
  // SAVE MEMORY
  // ================================================================

  const handleSaveMemory = async () => {
    setSaveError(null);

    // ----------------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------------

    if (!title.trim()) {
      setSaveError(
        "Please give this memory a title."
      );
      return;
    }

    if (!date) {
      setSaveError(
        "Please choose a date."
      );
      return;
    }

    setSaving(true);
    setSaveProgress(0);

    const uploadedPaths: string[] =
      [];

    try {
      // ----------------------------------------------------------
      // AUTH
      // ----------------------------------------------------------

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.replace(
          "/login"
        );
        return;
      }

      // ----------------------------------------------------------
      // UPLOAD MEDIA
      // ----------------------------------------------------------

      const totalMedia =
        selectedMedia.length;

      for (
        let index = 0;
        index < totalMedia;
        index++
      ) {
        const item =
          selectedMedia[index];

        const path =
          await uploadSingleMedia(
            item
          );

        uploadedPaths.push(path);

        setSaveProgress(
          Math.round(
            ((index + 1) /
              totalMedia) *
              80
          )
        );
      }

      // If there are no media files,
      // move progress forward.
      if (totalMedia === 0) {
        setSaveProgress(60);
      }

      // ----------------------------------------------------------
      // INSERT MEMORY
      // ----------------------------------------------------------

      const {
        data: insertedMemory,
        error: databaseError,
      } = await supabase
        .from("memories")
        .insert({
          title: title.trim(),

          description:
            description.trim() ||
            null,

          date,

          location:
            location.trim() ||
            null,

          media: uploadedPaths,
        })
        .select(
          "id, title, description, date, location, media"
        )
        .single();

      if (databaseError) {
        throw databaseError;
      }

      // ----------------------------------------------------------
      // CREATE SIGNED MEDIA FOR NEW MEMORY
      // ----------------------------------------------------------

      const signedMedia: SignedMedia[] =
        [];

      for (const path of uploadedPaths) {
        const signedUrl =
          await createSignedUrl(
            path
          );

        if (!signedUrl) {
          continue;
        }

        signedMedia.push({
          path,
          signedUrl,
          type: getMediaType(path),
        });
      }

      // ----------------------------------------------------------
      // ADD IMMEDIATELY TO PAGE
      // ----------------------------------------------------------

      const newMemory: MemoryWithMedia =
        {
          ...insertedMemory,
          signedMedia,
        };

      setMemories((current) => [
        newMemory,
        ...current,
      ]);

      // ----------------------------------------------------------
      // SUCCESS
      // ----------------------------------------------------------

      setSaveProgress(100);

      setTimeout(() => {
        setShowAddForm(false);

        setTitle("");
        setDescription("");
        setDate("");
        setLocation("");
        setSelectedMedia([]);
        setSaveError(null);
        setSaveProgress(0);
      }, 300);
    } catch (error) {
      console.error(
        "Failed to create memory:",
        error
      );

      // ----------------------------------------------------------
      // ROLLBACK STORAGE
      // ----------------------------------------------------------

      if (
        uploadedPaths.length > 0
      ) {
        await supabase.storage
          .from("media")
          .remove(
            uploadedPaths
          );
      }

      if (
        error instanceof Error
      ) {
        setSaveError(
          error.message
        );
      } else {
        setSaveError(
          "Unable to create this memory."
        );
      }

      setSaveProgress(0);
    } finally {
      setSaving(false);
    }
  };

  // ================================================================
  // PAGE
  // ================================================================

  return (
    <main className="min-h-[100svh] bg-[#f4f0ea] text-[#28231f]">

      {/* ============================================================ */}
      {/* HERO                                                         */}
      {/* ============================================================ */}

      <section className="relative h-[58svh] min-h-[430px] w-full overflow-hidden sm:h-[65svh] sm:min-h-[520px]">

        <Image
          src={memoriesImage}
          alt="Our memories"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-black/30" />

        <a
          href="/"
          className="absolute left-5 top-5 z-20 text-[10px] font-medium uppercase tracking-[0.25em] text-white/80 transition hover:text-white sm:left-10 sm:top-8"
        >
          ← Our Home
        </a>

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

        <div className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2 text-[9px] uppercase tracking-[0.3em] text-white/60">
          <span>Scroll</span>
          <span className="text-sm">
            ↓
          </span>
        </div>

      </section>

      {/* ============================================================ */}
      {/* INTRO                                                        */}
      {/* ============================================================ */}

      <section className="w-full px-5 pb-12 pt-20 sm:px-10 sm:pb-20 sm:pt-28">

        <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">

          <p className="text-[10px] uppercase tracking-[0.3em] text-[#8b4b3f]">
            Our story
          </p>

          <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
            A timeline of us
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#81766d]">
            From ordinary days to moments
            we never want to
            <br />
            forget.
          </p>

        </div>

      </section>

      {/* ============================================================ */}
      {/* LOADING                                                      */}
      {/* ============================================================ */}

      {loading && (
        <section className="flex min-h-[40vh] items-center justify-center px-5 text-center">

          <p className="text-[10px] uppercase tracking-[0.3em] text-[#81766d]">
            Opening our memories...
          </p>

        </section>
      )}

      {/* ============================================================ */}
      {/* ERROR                                                        */}
      {/* ============================================================ */}

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

      {/* ============================================================ */}
      {/* EMPTY                                                        */}
      {/* ============================================================ */}

      {!loading &&
        !error &&
        memories.length === 0 && (
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
              Maybe the first one is waiting
              to be made.
            </p>

          </section>
        )}

      {/* ============================================================ */}
      {/* TIMELINE                                                     */}
      {/* ============================================================ */}

      {!loading &&
        !error &&
        memories.length > 0 && (
          <section className="px-5 pb-24 sm:px-10 sm:pb-36">

            <div className="mx-auto max-w-6xl">

              <div className="relative">

                <div className="absolute bottom-0 left-[13px] top-0 w-px bg-[#28231f]/10 md:left-1/2 md:-translate-x-1/2" />

                {years.map(
                  (year, yearIndex) => (
                    <div key={year}>

                      {/* YEAR */}

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

                      {/* MEMORIES */}

                      <div className="space-y-16 md:space-y-24">

                        {memoriesByYear[
                          year
                        ].map(
                          (
                            memory,
                            memoryIndex
                          ) => {

                            const isEven =
                              memoryIndex %
                                2 ===
                              0;

                            return (
                              <article
                                key={
                                  memory.id
                                }
                                className="relative"
                              >

                                {/* DOT */}

                                <div className="absolute left-[8px] top-8 z-10 flex h-3 w-3 items-center justify-center rounded-full bg-[#8b4b3f] ring-4 ring-[#f4f0ea] md:left-1/2 md:-translate-x-1/2" />

                                {/* CONNECTOR */}

                                <div
                                  className={`absolute top-8 hidden h-px w-[calc(50%-24px)] bg-[#28231f]/10 md:block ${
                                    isEven
                                      ? "right-1/2 mr-3"
                                      : "left-1/2 ml-3"
                                  }`}
                                />

                                {/* CARD */}

                                <div
                                  className={`pl-12 md:w-1/2 md:pl-0 ${
                                    isEven
                                      ? "md:pr-16"
                                      : "md:ml-auto md:pl-16"
                                  }`}
                                >

                                  <div className="overflow-hidden rounded-md bg-[#ebe4da] shadow-[0_10px_40px_rgba(40,35,31,0.05)]">

                                    {/* MEDIA */}

                                    {memory.signedMedia.length >
                                      0 && (
                                      <div
                                        className={`grid ${
                                          memory.signedMedia.length ===
                                          1
                                            ? "grid-cols-1"
                                            : "grid-cols-2"
                                        }`}
                                      >

                                        {memory.signedMedia.map(
                                          (
                                            media,
                                            index
                                          ) => (
                                            <div
                                              key={`${memory.id}-${index}`}
                                              className="relative overflow-hidden bg-[#ddd4ca]"
                                            >

                                              {media.type ===
                                              "video" ? (
                                                <video
                                                  src={
                                                    media.signedUrl
                                                  }
                                                  controls
                                                  playsInline
                                                  preload="metadata"
                                                  className="block max-h-[500px] w-full object-contain"
                                                />
                                              ) : (
                                                <img
                                                  src={
                                                    media.signedUrl
                                                  }
                                                  alt={`${memory.title} ${
                                                    index +
                                                    1
                                                  }`}
                                                  loading={
                                                    index <
                                                    4
                                                      ? "eager"
                                                      : "lazy"
                                                  }
                                                  className="block max-h-[600px] w-full object-contain transition duration-700 hover:scale-[1.02]"
                                                />
                                              )}

                                            </div>
                                          )
                                        )}

                                      </div>
                                    )}

                                    {/* TEXT */}

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
                                              {
                                                memory.location
                                              }
                                            </p>
                                          </>
                                        )}

                                      </div>

                                      <h3 className="mt-4 font-serif text-2xl leading-tight sm:text-3xl">
                                        {
                                          memory.title
                                        }
                                      </h3>

                                      {memory.description && (
                                        <p className="mt-4 text-sm leading-7 text-[#81766d]">
                                          {
                                            memory.description
                                          }
                                        </p>
                                      )}

                                      <p className="mt-6 text-[9px] uppercase tracking-[0.2em] text-[#81766d]/60">
                                        {formatDate(
                                          memory.date
                                        )}
                                      </p>

                                    </div>

                                  </div>

                                </div>

                              </article>
                            );
                          }
                        )}

                      </div>

                      {yearIndex <
                        years.length -
                          1 && (
                        <div className="h-24 md:h-36" />
                      )}

                    </div>
                  )
                )}

              </div>

            </div>

          </section>
        )}

      {/* ============================================================ */}
      {/* ADD MEMORY BUTTON                                            */}
      {/* ============================================================ */}

      <section className="px-5 pb-20 pt-4 sm:px-10 sm:pb-28">

        <div className="mx-auto flex max-w-6xl justify-center">

          <button
            type="button"
            onClick={openAddForm}
            className="group inline-flex items-center gap-4 rounded-full bg-[#5d3928] px-7 py-4 text-[10px] font-medium uppercase tracking-[0.25em] !text-white shadow-sm transition hover:bg-[#8b4b3f] hover:shadow-md"
          >

            <span className="!text-white">
              Add a memory
            </span>

            <span className="text-base !text-white transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>

          </button>

        </div>

      </section>

      {/* ============================================================ */}
      {/* ADD MEMORY MODAL                                             */}
      {/* ============================================================ */}

      {showAddForm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 px-5 py-8 backdrop-blur-sm"
          onClick={closeAddForm}
        >

          <div
            className="w-full max-w-lg rounded-2xl bg-[#f4f0ea] p-7 shadow-2xl sm:p-9"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* HEADER */}

            <div className="flex items-start justify-between gap-6">

              <div>

                <p className="text-[9px] uppercase tracking-[0.3em] text-[#8b4b3f]">
                  Our story
                </p>

                <h2 className="mt-2 font-serif text-3xl text-[#28231f]">
                  Add a memory
                </h2>

              </div>

              <button
                type="button"
                disabled={saving}
                onClick={closeAddForm}
                className="text-2xl text-[#81766d] transition hover:text-[#28231f] disabled:opacity-40"
              >
                ×
              </button>

            </div>

            {/* ====================================================== */}
            {/* TITLE                                                   */}
            {/* ====================================================== */}

            <div className="mt-8">

              <label className="text-[9px] font-medium uppercase tracking-[0.25em] text-[#81766d]">
                Title *
              </label>

              <input
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target.value
                  )
                }
                disabled={saving}
                placeholder="Give this memory a name"
                className="mt-3 w-full rounded-lg border border-[#28231f]/10 bg-[#ebe4da] px-4 py-3.5 font-serif text-xl outline-none placeholder:text-[#81766d]/40 focus:border-[#8b4b3f]"
              />

            </div>

            {/* ====================================================== */}
            {/* DATE + LOCATION                                        */}
            {/* ====================================================== */}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">

              <div>

                <label className="text-[9px] font-medium uppercase tracking-[0.25em] text-[#81766d]">
                  Date *
                </label>

                <input
                  type="date"
                  value={date}
                  onChange={(event) =>
                    setDate(
                      event.target.value
                    )
                  }
                  disabled={saving}
                  className="mt-3 w-full rounded-lg border border-[#28231f]/10 bg-[#ebe4da] px-4 py-3.5 text-sm outline-none focus:border-[#8b4b3f]"
                />

              </div>

              <div>

                <label className="text-[9px] font-medium uppercase tracking-[0.25em] text-[#81766d]">
                  Location
                </label>

                <input
                  type="text"
                  value={location}
                  onChange={(event) =>
                    setLocation(
                      event.target.value
                    )
                  }
                  disabled={saving}
                  placeholder="Where were we?"
                  className="mt-3 w-full rounded-lg border border-[#28231f]/10 bg-[#ebe4da] px-4 py-3.5 text-sm outline-none placeholder:text-[#81766d]/40 focus:border-[#8b4b3f]"
                />

              </div>

            </div>

            {/* ====================================================== */}
            {/* DESCRIPTION                                            */}
            {/* ====================================================== */}

            <div className="mt-5">

              <label className="text-[9px] font-medium uppercase tracking-[0.25em] text-[#81766d]">
                Description
              </label>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                disabled={saving}
                rows={4}
                placeholder="Tell the story behind this moment..."
                className="mt-3 w-full resize-none rounded-lg border border-[#28231f]/10 bg-[#ebe4da] px-4 py-3.5 text-sm leading-6 outline-none placeholder:text-[#81766d]/40 focus:border-[#8b4b3f]"
              />

            </div>

            {/* ====================================================== */}
            {/* MEDIA PICKER                                           */}
            {/* ====================================================== */}

            <label className="mt-5 flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#28231f]/15 bg-[#ebe4da] px-5 text-center transition hover:border-[#8b4b3f]/50">

              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/webm,video/quicktime"
                disabled={saving}
                onChange={
                  handleMediaSelection
                }
                className="hidden"
              />

              <div className="font-serif text-4xl text-[#5d3928]/25">
                ♡
              </div>

              <p className="mt-3 font-serif text-lg">
                Add photos & videos
              </p>

              <p className="mt-1 text-xs text-[#81766d]">
                Multiple files allowed
              </p>

              <p className="mt-2 text-[8px] uppercase tracking-[0.12em] text-[#81766d]/70">
                Images 10 MB · Videos
                100 MB
              </p>

            </label>

            {/* ====================================================== */}
            {/* SELECTED MEDIA                                         */}
            {/* ====================================================== */}

            {selectedMedia.length >
              0 && (
              <div className="mt-4 max-h-[180px] overflow-y-auto rounded-xl bg-[#ebe4da] p-3">

                <div className="space-y-2">

                  {selectedMedia.map(
                    (item, index) => (
                      <div
                        key={`${item.file.name}-${item.file.size}-${index}`}
                        className="flex items-center gap-3 rounded-lg bg-[#f4f0ea] px-3 py-2.5"
                      >

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#ebe4da] font-serif text-base text-[#8b4b3f]">
                          {item.type ===
                          "image"
                            ? "♡"
                            : "▶"}
                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="truncate text-xs font-medium">
                            {
                              item
                                .file
                                .name
                            }
                          </p>

                          <p className="mt-0.5 text-[9px] uppercase tracking-[0.1em] text-[#81766d]">
                            {item.type}{" "}
                            ·{" "}
                            {(
                              item
                                .file
                                .size /
                              1024 /
                              1024
                            ).toFixed(
                              2
                            )}{" "}
                            MB
                          </p>

                        </div>

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            removeSelectedMedia(
                              index
                            )
                          }
                          className="shrink-0 text-lg text-[#81766d] transition hover:text-[#9f3f4d] disabled:opacity-30"
                        >
                          ×
                        </button>

                      </div>
                    )
                  )}

                </div>

              </div>
            )}

            {/* ====================================================== */}
            {/* PROGRESS                                                */}
            {/* ====================================================== */}

            {saving && (
              <div className="mt-5">

                <div className="flex justify-between text-[9px] uppercase tracking-[0.18em] text-[#81766d]">

                  <span>
                    Saving memory
                  </span>

                  <span>
                    {saveProgress}%
                  </span>

                </div>

                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#28231f]/10">

                  <div
                    className="h-full rounded-full bg-[#5d3928] transition-all duration-500"
                    style={{
                      width: `${saveProgress}%`,
                    }}
                  />

                </div>

                <p className="mt-3 text-center text-[9px] uppercase tracking-[0.15em] text-[#81766d]">
                  Please keep this window
                  open
                </p>

              </div>
            )}

            {/* ====================================================== */}
            {/* ERROR                                                   */}
            {/* ====================================================== */}

            {saveError && (
              <div className="mt-4 rounded-lg bg-[#9f3f4d]/5 px-4 py-3">

                <p className="text-center text-xs leading-6 text-[#9f3f4d]">
                  {saveError}
                </p>

              </div>
            )}

            {/* ====================================================== */}
            {/* BUTTONS                                                 */}
            {/* ====================================================== */}

            <div className="mt-7 flex gap-3">

              <button
                type="button"
                disabled={saving}
                onClick={closeAddForm}
                className="flex-1 rounded-full border border-[#28231f]/15 px-5 py-3.5 text-[10px] font-medium uppercase tracking-[0.2em] text-[#5d3928] transition hover:bg-[#ebe4da] disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  saving ||
                  !title.trim() ||
                  !date
                }
                onClick={
                  handleSaveMemory
                }
                className="flex-1 rounded-full bg-[#5d3928] px-5 py-3.5 text-[10px] font-medium uppercase tracking-[0.2em] !text-white transition hover:bg-[#8b4b3f] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving
                  ? `Saving ${saveProgress}%`
                  : "Save memory"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* FOOTER                                                       */}
      {/* ============================================================ */}

      <footer className="border-t border-black/[0.06] px-5 py-12 text-center sm:px-10">

        <p className="text-[9px] uppercase tracking-[0.3em] text-[#81766d]">
          Every moment matters ♡
        </p>

      </footer>

    </main>
  );
}
