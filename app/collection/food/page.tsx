"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import foodImage from "@/assets/food.jpg";

type FoodMedia = {
  media_id: string;
  media_url: string;
  category: string | null;
};

type GalleryMedia = FoodMedia & {
  signedUrl: string;
  type: "image" | "video";
};

export default function FoodPage() {
  const [media, setMedia] = useState<GalleryMedia[]>([]);
  const [loading, setLoading] = useState(true);

  // ================================================================
  // CATEGORY
  // ================================================================

  const [selectedCategory, setSelectedCategory] =
    useState("All");

  // ================================================================
  // ADD FOOD FORM
  // ================================================================

  const [showAddForm, setShowAddForm] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [selectedFiles, setSelectedFiles] =
    useState<File[]>([]);

  const [uploadError, setUploadError] =
    useState<string | null>(null);

  const [uploadProgress, setUploadProgress] =
    useState(0);

  const [category, setCategory] =
    useState("");

  // ================================================================
  // STORAGE PATH
  // ================================================================

  const getStoragePath = (
    value: string
  ): string => {
    if (!value.startsWith("http")) {
      return value;
    }

    try {
      const url = new URL(value);

      const marker =
        "/storage/v1/object/";

      const markerIndex =
        url.pathname.indexOf(marker);

      if (markerIndex === -1) {
        return value;
      }

      let path = url.pathname.substring(
        markerIndex + marker.length
      );

      path = path.replace(
        /^public\//,
        ""
      );

      path = path.replace(
        /^sign\//,
        ""
      );

      path = path.replace(
        /^authenticated\//,
        ""
      );

      if (path.startsWith("media/")) {
        path = path.substring(
          "media/".length
        );
      }

      return path;
    } catch {
      return value;
    }
  };

  // ================================================================
  // DETERMINE MEDIA TYPE
  // ================================================================

  const getMediaType = (
    path: string
  ): "image" | "video" => {
    const extension =
      path
        .split(".")
        .pop()
        ?.toLowerCase() || "";

    const videoExtensions = [
      "mp4",
      "webm",
      "mov",
      "m4v",
      "ogg",
      "ogv",
    ];

    return videoExtensions.includes(
      extension
    )
      ? "video"
      : "image";
  };

  // ================================================================
  // CREATE SIGNED URL
  // ================================================================

  const createSignedUrl = async (
    storagePath: string
  ): Promise<string | null> => {
    const cleanPath =
      storagePath.trim();

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
          message: error.message,
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
  // LOAD FOOD MEDIA
  // ================================================================

  useEffect(() => {
    let mounted = true;

    const loadMedia = async () => {
      setLoading(true);

      try {
        // ------------------------------------------------------------
        // AUTH
        // ------------------------------------------------------------

        const {
          data: {
            session,
          },
        } =
          await supabase.auth.getSession();

        if (!session) {
          window.location.replace(
            "/login"
          );

          return;
        }

        // ------------------------------------------------------------
        // DATABASE
        // ------------------------------------------------------------

        const {
          data,
          error,
        } = await supabase
          .from("food")
          .select(
            "media_id, media_url, category"
          )
          .order("media_id", {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        if (!mounted) {
          return;
        }

        // ------------------------------------------------------------
        // SIGNED URLS
        // ------------------------------------------------------------

        const gallery: GalleryMedia[] =
          [];

        for (const item of data ?? []) {
          const storagePath =
            getStoragePath(
              item.media_url
            );

          const signedUrl =
            await createSignedUrl(
              storagePath
            );

          if (!signedUrl) {
            console.error(
              "Skipping media:",
              item.media_url
            );

            continue;
          }

          gallery.push({
            media_id:
              item.media_id,

            media_url:
              item.media_url,

            category:
              item.category,

            signedUrl,

            type: getMediaType(
              storagePath
            ),
          });
        }

        if (mounted) {
          setMedia(gallery);
        }
      } catch (error) {
        console.error(
          "Failed to load food media:",
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadMedia();

    return () => {
      mounted = false;
    };
  }, []);

  // ================================================================
  // DYNAMIC CATEGORIES
  // ================================================================

  const categories = useMemo(() => {
    const uniqueCategories =
      new Set<string>();

    media.forEach((item) => {
      if (
        item.category &&
        item.category.trim()
      ) {
        uniqueCategories.add(
          item.category.trim()
        );
      }
    });

    return Array.from(
      uniqueCategories
    ).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [media]);

  // ================================================================
  // FILTER MEDIA
  // ================================================================

  const filteredMedia = useMemo(() => {
    if (
      selectedCategory === "All"
    ) {
      return media;
    }

    return media.filter(
      (item) =>
        item.category?.trim() ===
        selectedCategory
    );
  }, [
    media,
    selectedCategory,
  ]);

  // ================================================================
  // CLOSE MODAL
  // ================================================================

  const closeAddForm = () => {
    if (uploading) {
      return;
    }

    setShowAddForm(false);
    setSelectedFiles([]);
    setUploadError(null);
    setUploadProgress(0);
    setCategory("");
  };

  // ================================================================
  // FILE SELECTION
  // ================================================================

  const handleFileSelection = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(
      event.target.files ?? []
    );

    setUploadError(null);

    if (files.length === 0) {
      setSelectedFiles([]);
      return;
    }

    // ------------------------------------------------------------
    // VALIDATE TYPE
    // ------------------------------------------------------------

    const invalidFile =
      files.find((file) => {
        const isImage =
          file.type.startsWith(
            "image/"
          );

        const isVideo =
          file.type.startsWith(
            "video/"
          );

        return !isImage && !isVideo;
      });

    if (invalidFile) {
      setSelectedFiles([]);

      setUploadError(
        `"${invalidFile.name}" is not a supported image or video.`
      );

      return;
    }

    // ------------------------------------------------------------
    // MAX FILE SIZE
    // ------------------------------------------------------------

    const oversizedFile =
      files.find(
        (file) =>
          file.size >
          100 * 1024 * 1024
      );

    if (oversizedFile) {
      setSelectedFiles([]);

      setUploadError(
        `"${oversizedFile.name}" is larger than 100 MB.`
      );

      return;
    }

    setSelectedFiles(files);
  };

  // ================================================================
  // REMOVE SELECTED FILE
  // ================================================================

  const removeSelectedFile = (
    index: number
  ) => {
    if (uploading) {
      return;
    }

    setSelectedFiles(
      (current) =>
        current.filter(
          (_, fileIndex) =>
            fileIndex !== index
        )
    );

    setUploadError(null);
  };

  // ================================================================
  // UPLOAD SINGLE FILE
  // ================================================================

  const uploadSingleMedia = async (
    file: File,
    foodCategory: string
  ): Promise<GalleryMedia> => {
    const isVideo =
      file.type.startsWith(
        "video/"
      );

    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase() ||
      (isVideo
        ? "mp4"
        : "jpg");

    const fileName =
      `${crypto.randomUUID()}.${extension}`;

    const folder = isVideo
      ? "food/videos"
      : "food/images";

    const filePath =
      `${folder}/${fileName}`;

    console.log(
      "Uploading food media:",
      filePath
    );

    // ------------------------------------------------------------
    // STORAGE
    // ------------------------------------------------------------

    const {
      data: uploadData,
      error: storageError,
    } =
      await supabase.storage
        .from("media")
        .upload(
          filePath,
          file,
          {
            cacheControl: "3600",
            upsert: false,
            contentType:
              file.type,
          }
        );

    if (storageError) {
      console.error(
        "Storage upload error:",
        storageError
      );

      throw new Error(
        `${file.name}: ${storageError.message}`
      );
    }

    console.log(
      "Upload successful:",
      uploadData
    );

    // ------------------------------------------------------------
    // DATABASE
    // ------------------------------------------------------------

    const {
      data: insertedMedia,
      error: databaseError,
    } =
      await supabase
        .from("food")
        .insert({
          media_url:
            filePath,

          category:
            foodCategory ||
            null,
        })
        .select(
          "media_id, media_url, category"
        )
        .single();

    if (databaseError) {
      console.error(
        "Database insert error:",
        databaseError
      );

      // Rollback storage upload
      await supabase.storage
        .from("media")
        .remove([
          filePath,
        ]);

      throw new Error(
        `${file.name}: ${databaseError.message}`
      );
    }

    // ------------------------------------------------------------
    // SIGNED URL
    // ------------------------------------------------------------

    const signedUrl =
      await createSignedUrl(
        filePath
      );

    if (!signedUrl) {
      throw new Error(
        `${file.name}: Unable to create temporary media URL.`
      );
    }

    return {
      media_id:
        insertedMedia.media_id,

      media_url:
        insertedMedia.media_url,

      category:
        insertedMedia.category,

      signedUrl,

      type: isVideo
        ? "video"
        : "image",
    };
  };

  // ================================================================
  // UPLOAD ALL
  // ================================================================

  const handleUpload = async () => {
    if (
      selectedFiles.length === 0
    ) {
      setUploadError(
        "Please choose at least one image or video."
      );

      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    try {
      // ------------------------------------------------------------
      // AUTH
      // ------------------------------------------------------------

      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (!session) {
        window.location.replace(
          "/login"
        );

        return;
      }

      // ------------------------------------------------------------
      // CATEGORY
      // ------------------------------------------------------------

      const cleanCategory =
        category.trim();

      if (!cleanCategory) {
        setUploadError(
          "Please enter a category."
        );

        setUploading(false);

        return;
      }

      const failedFiles: string[] =
        [];

      // ------------------------------------------------------------
      // UPLOAD ONE BY ONE
      // ------------------------------------------------------------

      for (
        let index = 0;
        index <
        selectedFiles.length;
        index++
      ) {
        const file =
          selectedFiles[index];

        try {
          const uploaded =
            await uploadSingleMedia(
              file,
              cleanCategory
            );

          // Add immediately to gallery
          setMedia(
            (current) => [
              uploaded,
              ...current,
            ]
          );
        } catch (error) {
          console.error(
            `Failed to upload ${file.name}:`,
            error
          );

          failedFiles.push(
            file.name
          );
        }

        setUploadProgress(
          Math.round(
            ((index + 1) /
              selectedFiles.length) *
              100
          )
        );
      }

      // ------------------------------------------------------------
      // FAILED FILES
      // ------------------------------------------------------------

      if (
        failedFiles.length > 0
      ) {
        setUploadError(
          `${failedFiles.length} file${
            failedFiles.length === 1
              ? ""
              : "s"
          } could not be uploaded: ${failedFiles.join(
            ", "
          )}`
        );

        setSelectedFiles(
          failedFiles.map(
            (fileName) =>
              selectedFiles.find(
                (file) =>
                  file.name ===
                  fileName
              )!
          )
        );

        return;
      }

      // ------------------------------------------------------------
      // SUCCESS
      // ------------------------------------------------------------

      setSelectedFiles([]);
      setShowAddForm(false);
      setUploadError(null);
      setUploadProgress(0);
      setCategory("");

      // If currently viewing All,
      // everything is visible.
      //
      // If viewing another category,
      // automatically switch to the
      // newly added category.
      setSelectedCategory(
        cleanCategory
      );
    } catch (error) {
      console.error(
        "Food upload failed:",
        error
      );

      setUploadError(
        error instanceof Error
          ? error.message
          : "Unable to upload the food media."
      );
    } finally {
      setUploading(false);
    }
  };

  // ================================================================
  // LOADING
  // ================================================================

  if (loading) {
    return (
      <main className="flex min-h-[100svh] items-center justify-center bg-[#f4f0ea]">
        <div className="text-center">
          <div className="mb-4 font-serif text-4xl text-[#5d3928]/40">
            ♡
          </div>

          <p className="text-[10px] uppercase tracking-[0.3em] text-[#81766d]">
            Opening our kitchen...
          </p>
        </div>
      </main>
    );
  }

  // ================================================================
  // PAGE
  // ================================================================

  return (
    <main className="min-h-[100svh] bg-[#f4f0ea] text-[#28231f]">

      {/* ============================================================
          HERO
      ============================================================ */}

      <section className="relative h-[65svh] min-h-[450px] w-full overflow-hidden sm:h-[70svh] sm:min-h-[520px]">

        <Image
          src={foodImage}
          alt="Food"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-black/25" />

        {/* Navigation */}

        <a
          href="/"
          className="absolute left-5 top-6 z-20 text-[10px] font-medium uppercase tracking-[0.25em] text-white/80 transition hover:text-white sm:left-10 sm:top-8"
        >
          ← Our Home
        </a>

        {/* Hero content */}

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center text-white">

          <p className="text-[10px] uppercase tracking-[0.35em] text-white/80 sm:text-xs">
            Things we love to make
          </p>

          <h1 className="mt-5 font-serif text-7xl tracking-tight sm:text-8xl md:text-9xl">
            Food
          </h1>

          <div className="mt-7 h-px w-12 bg-white/70" />

          <p className="mt-6 max-w-md text-sm leading-7 text-white/80 sm:text-base">
            Recipes, little experiments,
            <br />
            and delicious things we make together.
          </p>

        </div>

        {/* Scroll */}

        <div className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2 text-[9px] uppercase tracking-[0.3em] text-white/60">
          <span>Scroll</span>

          <span className="text-sm">
            ↓
          </span>
        </div>

      </section>

      {/* ============================================================
          INTRO
      ============================================================ */}

      <section className="w-full px-5 pb-12 pt-20 sm:px-10 sm:pb-16 sm:pt-28">

        <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">

          <p className="text-[10px] uppercase tracking-[0.3em] text-[#8b4b3f]">
            Our kitchen
          </p>

          <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
            Things worth making
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#81766d]">
            Recipes we want to try,
            <br />
            dishes we want to make,
            and food we want to remember.
          </p>

        </div>

      </section>

      {/* ============================================================
          CATEGORY FILTERS
      ============================================================ */}

      <section className="px-5 pb-8 sm:px-8 lg:px-12">

        <div className="mx-auto w-full max-w-7xl">

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">

            {/* ALL */}

            <button
              type="button"
              onClick={() =>
                setSelectedCategory(
                  "All"
                )
              }
              className={`shrink-0 rounded-full px-5 py-2.5 text-[9px] font-medium tracking-[0.2em] transition ${
                selectedCategory ===
                "All"
                  ? "bg-[#5d3928] !text-white shadow-sm"
                  : "bg-[#ebe4da] text-[#81766d] hover:bg-[#e2d9ce] hover:text-[#5d3928]"
              }`}
            >
              All
            </button>

            {/* DYNAMIC CATEGORIES */}

            {categories.map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setSelectedCategory(
                      item
                    )
                  }
                  className={`shrink-0 rounded-full px-5 py-2.5 text-[9px] font-medium tracking-[0.2em] transition ${
                    selectedCategory ===
                    item
                      ? "bg-[#5d3928] !text-white shadow-sm"
                      : "bg-[#ebe4da] text-[#81766d] hover:bg-[#e2d9ce] hover:text-[#5d3928]"
                  }`}
                >
                  {item}
                </button>
              )
            )}

          </div>

        </div>

      </section>

      {/* ============================================================
          MEDIA SCROLL CONTAINER
      ============================================================ */}

      <section className="px-5 pb-20 sm:px-8 sm:pb-28 lg:px-12">

        <div className="mx-auto w-full max-w-7xl">

          <div className="relative h-[65svh] min-h-[450px] max-h-[850px] overflow-y-auto rounded-2xl border border-black/[0.06] bg-[#ebe4da]/50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] sm:h-[70svh] sm:p-6">

            {/* ======================================================
                EMPTY STATE
            ====================================================== */}

            {filteredMedia.length === 0 && (
              <div className="flex h-full min-h-[350px] flex-col items-center justify-center px-5 text-center">

                <div className="font-serif text-6xl text-[#5d3928]/25">
                  ♡
                </div>

                <h2 className="mt-7 font-serif text-3xl sm:text-4xl">
                  {selectedCategory ===
                  "All"
                    ? "Our kitchen is waiting."
                    : `No ${selectedCategory.toLowerCase()} food yet.`}
                </h2>

                <p className="mt-4 max-w-md text-sm leading-7 text-[#81766d]">
                  {selectedCategory ===
                  "All" ? (
                    <>
                      There are no food ideas
                      here yet.
                      <br />
                      Maybe the first delicious
                      thing belongs here.
                    </>
                  ) : (
                    <>
                      Nothing has been added
                      to this category yet.
                      <br />
                      Maybe something delicious
                      belongs here.
                    </>
                  )}
                </p>

              </div>
            )}

            {/* ======================================================
                GALLERY
            ====================================================== */}

            {filteredMedia.length >
              0 && (
              <div className="columns-2 gap-4 sm:columns-3 lg:columns-3 xl:columns-4">

                {filteredMedia.map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={
                        item.media_id
                      }
                      className="mb-4 break-inside-avoid"
                    >

                      <div className="group relative overflow-hidden rounded-[4px] bg-[#e5ddd3] shadow-[0_4px_20px_rgba(60,40,30,0.05)] transition-all duration-700 hover:-translate-y-1 hover:shadow-[0_12px_35px_rgba(60,40,30,0.10)]">

                        {/* IMAGE */}

                        {item.type ===
                          "image" && (
                          <img
                            src={
                              item.signedUrl
                            }
                            alt={
                              item.category
                                ? item.category
                                : "Food"
                            }
                            loading={
                              index <
                              6
                                ? "eager"
                                : "lazy"
                            }
                            className="block h-auto w-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                          />
                        )}

                        {/* VIDEO */}

                        {item.type ===
                          "video" && (
                          <video
                            src={
                              item.signedUrl
                            }
                            controls
                            playsInline
                            preload={
                              index <
                              4
                                ? "metadata"
                                : "none"
                            }
                            className="block h-auto w-full bg-black"
                          />
                        )}

                        {/* CATEGORY LABEL */}

                        {item.category && (
                          <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/50 px-3 py-1.5 text-[8px] tracking-[0.2em] text-white backdrop-blur-sm">
                            {
                              item.category
                            }
                          </div>
                        )}

                        {/* VIDEO LABEL */}

                        {item.type ===
                          "video" && (
                          <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1.5 text-[8px] tracking-[0.2em] text-white backdrop-blur-sm">
                            Video
                          </div>
                        )}

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          </div>

          {/* SCROLL HINT */}

          {filteredMedia.length >
            0 && (
            <p className="mt-3 text-center text-[8px] uppercase tracking-[0.25em] text-[#81766d]/60">
              Scroll inside the collection
            </p>
          )}

        </div>

      </section>

      {/* ============================================================
          ADD BUTTON
      ============================================================ */}

      <section className="px-5 pb-20 pt-4 sm:px-10 sm:pb-28">

        <div className="flex justify-center">

          <button
            type="button"
            onClick={() => {
              setUploadError(
                null
              );

              setSelectedFiles(
                []
              );

              setUploadProgress(
                0
              );

              setCategory("");

              setShowAddForm(
                true
              );
            }}
            className="inline-flex items-center gap-4 rounded-full bg-[#5d3928] px-7 py-4 text-[10px] font-medium uppercase tracking-[0.25em] !text-white shadow-sm transition hover:bg-[#8b4b3f] hover:shadow-md"
          >
            <span className="!text-white">
              Add food
            </span>

            <span className="text-base !text-white">
              →
            </span>
          </button>

        </div>

      </section>

      {/* ============================================================
          ADD FOOD MODAL
      ============================================================ */}

      {showAddForm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 px-5 py-8 backdrop-blur-sm"
          onClick={
            closeAddForm
          }
        >

          <div
            className="w-full max-w-md rounded-2xl bg-[#f4f0ea] p-7 shadow-2xl sm:p-9"
            onClick={(
              event
            ) => {
              event.stopPropagation();
            }}
          >

            {/* HEADER */}

            <div className="flex items-start justify-between gap-6">

              <div>

                <p className="text-[9px] uppercase tracking-[0.3em] text-[#8b4b3f]">
                  Our kitchen
                </p>

                <h2 className="mt-2 font-serif text-3xl text-[#28231f]">
                  Add food
                </h2>

              </div>

              <button
                type="button"
                disabled={
                  uploading
                }
                onClick={
                  closeAddForm
                }
                className="text-2xl text-[#81766d] transition hover:text-[#28231f] disabled:opacity-40"
              >
                ×
              </button>

            </div>

            {/* ======================================================
                CATEGORY
            ====================================================== */}

            <div className="mt-7">

              <label
                htmlFor="food-category"
                className="block text-[9px] font-medium uppercase tracking-[0.25em] text-[#81766d]"
              >
                Category
              </label>

              <textarea
                id="food-category"
                value={category}
                onChange={(
                  event
                ) =>
                  setCategory(
                    event.target.value
                  )
                }
                disabled={
                  uploading
                }
                rows={2}
                placeholder="e.g. Sweet, Dessert, Spicy..."
                className="mt-3 w-full resize-none rounded-xl border border-[#28231f]/10 bg-[#ebe4da] px-4 py-3 text-sm text-[#28231f] outline-none transition placeholder:text-[#81766d]/50 focus:border-[#8b4b3f]/50 focus:ring-1 focus:ring-[#8b4b3f]/20 disabled:opacity-50"
              />

              <p className="mt-2 text-[9px] leading-5 text-[#81766d]">
                You can enter a new category.
                It will automatically appear
                in the category filters.
              </p>

            </div>

            {/* ======================================================
                FILE PICKER
            ====================================================== */}

            <label
              className={`mt-6 flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#28231f]/20 bg-[#ebe4da] px-6 text-center transition hover:border-[#8b4b3f]/50 ${
                selectedFiles.length >
                0
                  ? "border-[#8b4b3f]"
                  : ""
              }`}
            >

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/webm,video/quicktime,video/x-m4v"
                multiple
                className="hidden"
                disabled={
                  uploading
                }
                onChange={
                  handleFileSelection
                }
              />

              {selectedFiles.length >
              0 ? (
                <>

                  <div className="font-serif text-4xl text-[#8b4b3f]">
                    ✓
                  </div>

                  <p className="mt-4 font-serif text-xl text-[#28231f]">
                    {
                      selectedFiles.length
                    }{" "}
                    {selectedFiles.length ===
                    1
                      ? "file"
                      : "files"}{" "}
                    selected
                  </p>

                  <p className="mt-2 text-xs text-[#81766d]">
                    Click to choose more
                  </p>

                  <p className="mt-4 text-[9px] tracking-[0.2em] text-[#8b4b3f]">
                    Images and videos
                    are supported
                  </p>

                </>
              ) : (
                <>

                  <div className="font-serif text-5xl text-[#5d3928]/30">
                    ♡
                  </div>

                  <p className="mt-5 font-serif text-xl text-[#28231f]">
                    Choose food media
                  </p>

                  <p className="mt-2 text-xs text-[#81766d]">
                    Select multiple
                    images or videos
                  </p>

                  <p className="mt-3 text-[9px] uppercase tracking-[0.15em] text-[#81766d]/70">
                    Images & videos ·
                    Maximum 100 MB each
                  </p>

                </>
              )}

            </label>

            {/* ======================================================
                SELECTED FILES
            ====================================================== */}

            {selectedFiles.length >
              0 && (
              <div className="mt-5 max-h-[200px] overflow-y-auto rounded-xl bg-[#ebe4da] p-3">

                <div className="space-y-2">

                  {selectedFiles.map(
                    (
                      file,
                      index
                    ) => {
                      const isVideo =
                        file.type.startsWith(
                          "video/"
                        );

                      return (
                        <div
                          key={`${file.name}-${file.size}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-lg bg-[#f4f0ea] px-3 py-2.5"
                        >

                          <div className="flex min-w-0 items-center gap-3">

                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ebe4da] text-sm">
                              {isVideo
                                ? "▶"
                                : "♡"}
                            </span>

                            <div className="min-w-0">

                              <p className="truncate text-xs font-medium text-[#28231f]">
                                {
                                  file.name
                                }
                              </p>

                              <p className="mt-0.5 text-[9px] text-[#81766d]">
                                {(
                                  file.size /
                                  1024 /
                                  1024
                                ).toFixed(
                                  2
                                )}{" "}
                                MB
                              </p>

                            </div>

                          </div>

                          <button
                            type="button"
                            disabled={
                              uploading
                            }
                            onClick={() =>
                              removeSelectedFile(
                                index
                              )
                            }
                            className="shrink-0 text-lg text-[#81766d] transition hover:text-[#9f3f4d] disabled:opacity-30"
                            aria-label={`Remove ${file.name}`}
                          >
                            ×
                          </button>

                        </div>
                      );
                    }
                  )}

                </div>

              </div>
            )}

            {/* ======================================================
                PROGRESS
            ====================================================== */}

            {uploading && (
              <div className="mt-5">

                <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.18em] text-[#81766d]">

                  <span>
                    Uploading
                  </span>

                  <span>
                    {
                      uploadProgress
                    }%
                  </span>

                </div>

                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#28231f]/10">

                  <div
                    className="h-full rounded-full bg-[#5d3928] transition-all duration-500"
                    style={{
                      width: `${uploadProgress}%`,
                    }}
                  />

                </div>

                <p className="mt-3 text-center text-[9px] uppercase tracking-[0.15em] text-[#81766d]">
                  Please keep this
                  window open
                </p>

              </div>
            )}

            {/* ======================================================
                ERROR
            ====================================================== */}

            {uploadError && (
              <div className="mt-4 rounded-lg bg-[#9f3f4d]/5 px-4 py-3">

                <p className="text-center text-xs leading-6 text-[#9f3f4d]">
                  {
                    uploadError
                  }
                </p>

              </div>
            )}

            {/* ======================================================
                BUTTONS
            ====================================================== */}

            <div className="mt-7 flex gap-3">

              <button
                type="button"
                disabled={
                  uploading
                }
                onClick={
                  closeAddForm
                }
                className="flex-1 rounded-full border border-[#28231f]/15 px-5 py-3.5 text-[10px] font-medium tracking-[0.2em] text-[#5d3928] transition hover:bg-[#ebe4da] disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  selectedFiles.length ===
                    0 ||
                  uploading ||
                  !category.trim()
                }
                onClick={
                  handleUpload
                }
                className="flex-1 rounded-full bg-[#5d3928] px-5 py-3.5 text-[10px] font-medium tracking-[0.2em] !text-white transition hover:bg-[#8b4b3f] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {uploading
                  ? `Uploading ${uploadProgress}%`
                  : selectedFiles.length >
                    0
                  ? `Add ${selectedFiles.length} ${
                      selectedFiles.length ===
                      1
                        ? "file"
                        : "files"
                    }`
                  : "Add food"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ============================================================
          FOOTER
      ============================================================ */}

      <footer className="border-t border-black/[0.06] px-5 py-12 text-center">

        <p className="text-[9px] uppercase tracking-[0.3em] text-[#81766d]">
          Made with love ♡
        </p>

      </footer>

    </main>
  );
}
