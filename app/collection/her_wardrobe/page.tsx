"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import wardrobeImage from "@/assets/wardrobe.jpg";

type WardrobeMedia = {
  media_id: string;
  media_url: string;
  signedUrl: string;
  type: "image" | "video";
};

export default function HerWardrobePage() {
  const [media, setMedia] = useState<WardrobeMedia[]>([]);
  const [loading, setLoading] = useState(true);

  // ================================================================
  // ADD MEDIA FORM
  // ================================================================

  const [showAddForm, setShowAddForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ================================================================
  // GET STORAGE PATH
  // ================================================================

  const getStoragePath = (value: string): string => {
    if (!value.startsWith("http")) {
      return value;
    }

    try {
      const url = new URL(value);

      const marker = "/storage/v1/object/";
      const markerIndex = url.pathname.indexOf(marker);

      if (markerIndex === -1) {
        return value;
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

      return path;
    } catch {
      return value;
    }
  };

  // ================================================================
  // DETERMINE MEDIA TYPE
  // ================================================================

  const getMediaType = (
    storagePath: string
  ): "image" | "video" => {
    if (storagePath.startsWith("her_wardrobe/videos/")) {
      return "video";
    }

    return "image";
  };

  // ================================================================
  // CREATE SIGNED URL
  // ================================================================

  const createSignedUrl = async (
    storagePath: string
  ): Promise<string | null> => {
    const cleanPath = storagePath.trim();

    if (!cleanPath) {
      return null;
    }

    const { data, error } = await supabase.storage
      .from("media")
      .createSignedUrl(cleanPath, 60 * 60);

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

    return data?.signedUrl ?? null;
  };

  // ================================================================
  // LOAD MEDIA
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
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          window.location.replace("/login");
          return;
        }

        // ------------------------------------------------------------
        // GET DATABASE ROWS
        // ------------------------------------------------------------

        const { data, error } = await supabase
          .from("her_wardrobe")
          .select("media_id, media_url")
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
        // CREATE SIGNED URLS
        // ------------------------------------------------------------

        const loadedMedia: WardrobeMedia[] = [];

        for (const item of data ?? []) {
          const storagePath = getStoragePath(
            item.media_url
          );

          const signedUrl =
            await createSignedUrl(storagePath);

          if (!signedUrl) {
            console.error(
              "Skipping media:",
              item.media_url
            );

            continue;
          }

          loadedMedia.push({
            media_id: item.media_id,
            media_url: item.media_url,
            signedUrl,
            type: getMediaType(storagePath),
          });
        }

        if (mounted) {
          setMedia(loadedMedia);
        }
      } catch (error) {
        console.error(
          "Failed to load wardrobe media:",
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
  // CLOSE FORM
  // ================================================================

  const closeAddForm = () => {
    if (uploading) {
      return;
    }

    setShowAddForm(false);
    setSelectedFiles([]);
    setUploadError(null);
    setUploadProgress(0);
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
    // VALIDATE FILE TYPES
    // ------------------------------------------------------------

    const invalidFile = files.find(
      (file) =>
        !file.type.startsWith("image/") &&
        !file.type.startsWith("video/")
    );

    if (invalidFile) {
      setSelectedFiles([]);

      setUploadError(
        `"${invalidFile.name}" is not a supported image or video.`
      );

      return;
    }

    // ------------------------------------------------------------
    // MAX FILE SIZE
    // Images: 10 MB
    // Videos: 100 MB
    // ------------------------------------------------------------

    const oversizedFile = files.find((file) => {
      const maxSize = file.type.startsWith("video/")
        ? 100 * 1024 * 1024
        : 10 * 1024 * 1024;

      return file.size > maxSize;
    });

    if (oversizedFile) {
      const isVideo =
        oversizedFile.type.startsWith("video/");

      setSelectedFiles([]);

      setUploadError(
        `"${oversizedFile.name}" is larger than ${
          isVideo ? "100 MB" : "10 MB"
        }.`
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

    setSelectedFiles((current) =>
      current.filter(
        (_, fileIndex) =>
          fileIndex !== index
      )
    );

    setUploadError(null);
  };

  // ================================================================
  // UPLOAD SINGLE MEDIA
  // ================================================================

  const uploadSingleMedia = async (
    file: File
  ): Promise<WardrobeMedia> => {
    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase() || "jpg";

    const fileName =
      `${crypto.randomUUID()}.${extension}`;

    const isVideo =
      file.type.startsWith("video/");

    const folder = isVideo
      ? "her_wardrobe/videos"
      : "her_wardrobe/images";

    const filePath =
      `${folder}/${fileName}`;

    console.log(
      "Uploading wardrobe media:",
      filePath
    );

    // ------------------------------------------------------------
    // UPLOAD TO STORAGE
    // ------------------------------------------------------------

    const {
      data: uploadData,
      error: storageError,
    } = await supabase.storage
      .from("media")
      .upload(
        filePath,
        file,
        {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        }
      );

    if (storageError) {
      console.error(
        "Storage upload error:",
        storageError
      );

      throw new Error(
        `${file.name}: ${
          storageError.message ||
          "Unable to upload."
        }`
      );
    }

    console.log(
      "Upload successful:",
      uploadData
    );

    // ------------------------------------------------------------
    // SAVE PATH TO DATABASE
    // ------------------------------------------------------------

    const {
      data: insertedMedia,
      error: databaseError,
    } = await supabase
      .from("her_wardrobe")
      .insert({
        media_url: filePath,
      })
      .select(
        "media_id, media_url"
      )
      .single();

    if (databaseError) {
      console.error(
        "Database insert error:",
        databaseError
      );

      await supabase.storage
        .from("media")
        .remove([filePath]);

      throw new Error(
        `${file.name}: ${
          databaseError.message ||
          "Database entry failed."
        }`
      );
    }

    // ------------------------------------------------------------
    // CREATE SIGNED URL
    // ------------------------------------------------------------

    const signedUrl =
      await createSignedUrl(filePath);

    if (!signedUrl) {
      throw new Error(
        `${file.name}: Media uploaded but a temporary URL could not be created.`
      );
    }

    return {
      media_id:
        insertedMedia.media_id,
      media_url:
        insertedMedia.media_url,
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
    if (selectedFiles.length === 0) {
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
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.replace("/login");
        return;
      }

      const failedFiles: string[] = [];
      const totalFiles = selectedFiles.length;

      // ------------------------------------------------------------
      // UPLOAD ONE BY ONE
      // ------------------------------------------------------------

      for (
        let index = 0;
        index < totalFiles;
        index++
      ) {
        const file =
          selectedFiles[index];

        try {
          const uploaded =
            await uploadSingleMedia(file);

          setMedia((current) => [
            uploaded,
            ...current,
          ]);
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
              totalFiles) *
              100
          )
        );
      }

      // ------------------------------------------------------------
      // HANDLE FAILURES
      // ------------------------------------------------------------

      if (failedFiles.length > 0) {
        setUploadError(
          `${failedFiles.length} ${
            failedFiles.length === 1
              ? "file"
              : "files"
          } could not be uploaded: ${failedFiles.join(
            ", "
          )}`
        );

        setSelectedFiles(
          failedFiles
            .map((name) =>
              selectedFiles.find(
                (file) =>
                  file.name === name
              )
            )
            .filter(
              (file): file is File =>
                Boolean(file)
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
    } catch (error) {
      console.error(
        "Upload process failed:",
        error
      );

      if (error instanceof Error) {
        setUploadError(
          error.message
        );
      } else {
        setUploadError(
          "Unable to upload the media."
        );
      }
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
            Opening her wardrobe...
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

      {/* ============================================================ */}
      {/* HERO                                                         */}
      {/* ============================================================ */}

      <section className="relative h-[65svh] min-h-[450px] w-full overflow-hidden sm:h-[70svh] sm:min-h-[520px]">

        <Image
          src={wardrobeImage}
          alt="Her wardrobe"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-black/25" />

        {/* Home */}

        <a
          href="/"
          className="absolute left-5 top-6 z-20 text-[10px] font-medium uppercase tracking-[0.25em] text-white/80 transition hover:text-white sm:left-10 sm:top-8"
        >
          ← Our Home
        </a>

        {/* Hero */}

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center text-white">

          <p className="text-[10px] uppercase tracking-[0.35em] text-white/80 sm:text-xs">
            A collection of what she wears
          </p>

          <h1 className="mt-5 font-serif text-6xl tracking-tight sm:text-8xl md:text-9xl">
            Her Wardrobe
          </h1>

          <div className="mt-7 h-px w-12 bg-white/70" />

          <p className="mt-6 max-w-md text-sm leading-7 text-white/80 sm:text-base">
            Clothes, outfits, little details,
            <br />
            and all the looks that feel like her.
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

      {/* ============================================================ */}
      {/* INTRO                                                        */}
      {/* ============================================================ */}

      <section className="w-full px-5 pb-12 pt-20 sm:px-10 sm:pb-16 sm:pt-28">

        <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">

          <p className="text-[10px] uppercase tracking-[0.3em] text-[#8b4b3f]">
            Her wardrobe
          </p>

          <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
            A little bit of her style
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#81766d]">
            Outfits, clothes and ideas worth
            remembering.
            <br />
            Everything that makes her style, hers.
          </p>

        </div>

      </section>

      {/* ============================================================ */}
      {/* SCROLLABLE MEDIA COLLECTION                                  */}
      {/* ============================================================ */}

      <section className="px-5 pb-24 sm:px-8 sm:pb-36 lg:px-12">

        <div className="mx-auto w-full max-w-7xl">

          <div className="relative h-[65svh] min-h-[450px] max-h-[850px] overflow-y-auto rounded-2xl border border-black/[0.06] bg-[#ebe4da]/50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] sm:h-[70svh] sm:p-6">

            {/* ======================================================
                EMPTY STATE
            ====================================================== */}

            {media.length === 0 && (
              <div className="flex h-full min-h-[350px] flex-col items-center justify-center px-5 text-center">

                <div className="font-serif text-6xl text-[#5d3928]/25">
                  ♡
                </div>

                <h2 className="mt-7 font-serif text-3xl sm:text-4xl">
                  Her wardrobe is waiting.
                </h2>

                <p className="mt-4 max-w-md text-sm leading-7 text-[#81766d]">
                  There are no pictures or
                  videos here yet.
                  <br />
                  Maybe the first one belongs
                  here.
                </p>

              </div>
            )}

            {/* ======================================================
                MEDIA GALLERY
            ====================================================== */}

            {media.length > 0 && (
              <div className="columns-2 gap-4 sm:columns-3 lg:columns-3 xl:columns-4">

                {media.map((item, index) => (

                  <div
                    key={item.media_id}
                    className="mb-4 break-inside-avoid"
                  >

                    <div className="group relative overflow-hidden rounded-[3px] bg-[#e5ddd3] shadow-[0_4px_20px_rgba(60,40,30,0.05)] transition-all duration-700 hover:-translate-y-1 hover:shadow-[0_12px_35px_rgba(60,40,30,0.10)]">

                      {/* ================================================= */}
                      {/* IMAGE                                             */}
                      {/* ================================================= */}

                      {item.type === "image" && (
                        <img
                          src={item.signedUrl}
                          alt="Her wardrobe"
                          loading={
                            index < 6
                              ? "eager"
                              : "lazy"
                          }
                          className="block h-auto w-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                        />
                      )}

                      {/* ================================================= */}
                      {/* VIDEO                                             */}
                      {/* ================================================= */}

                      {item.type === "video" && (
                        <div className="relative bg-black">

                          <video
                            src={item.signedUrl}
                            controls
                            playsInline
                            preload={
                              index < 4
                                ? "metadata"
                                : "none"
                            }
                            className="block h-auto max-h-[700px] w-full object-contain"
                          />

                          {/* Video label */}

                          <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1.5 text-[8px] uppercase tracking-[0.2em] text-white backdrop-blur-sm">
                            Video
                          </div>

                        </div>
                      )}

                      {/* Hover overlay */}

                      <div className="pointer-events-none absolute inset-0 bg-black/0 transition duration-500 group-hover:bg-black/[0.025]" />

                    </div>

                  </div>

                ))}

              </div>
            )}

          </div>

          {/* Scroll hint */}

          {media.length > 0 && (
            <p className="mt-3 text-center text-[8px] uppercase tracking-[0.25em] text-[#81766d]/60">
              Scroll inside the collection
            </p>
          )}

        </div>

      </section>

      {/* ============================================================ */}
      {/* ADD BUTTON                                                    */}
      {/* ============================================================ */}

      <section className="px-5 pb-20 pt-4 sm:px-10 sm:pb-28">

        <div className="flex justify-center">

          <button
            type="button"
            onClick={() => {
              setUploadError(null);
              setSelectedFiles([]);
              setUploadProgress(0);
              setShowAddForm(true);
            }}
            className="inline-flex items-center gap-4 rounded-full bg-[#5d3928] px-7 py-4 text-[10px] font-medium uppercase tracking-[0.25em] !text-white shadow-sm transition hover:bg-[#8b4b3f] hover:shadow-md"
          >

            <span className="!text-white">
              Add pictures / videos
            </span>

            <span className="text-base !text-white">
              →
            </span>

          </button>

        </div>

      </section>

      {/* ============================================================ */}
      {/* ADD MEDIA MODAL                                               */}
      {/* ============================================================ */}

      {showAddForm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 px-5 py-8 backdrop-blur-sm"
          onClick={closeAddForm}
        >

          <div
            className="w-full max-w-md rounded-2xl bg-[#f4f0ea] p-7 shadow-2xl sm:p-9"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >

            {/* Header */}

            <div className="flex items-start justify-between gap-6">

              <div>

                <p className="text-[9px] uppercase tracking-[0.3em] text-[#8b4b3f]">
                  Her wardrobe
                </p>

                <h2 className="mt-2 font-serif text-3xl text-[#28231f]">
                  Add media
                </h2>

              </div>

              <button
                type="button"
                disabled={uploading}
                onClick={closeAddForm}
                className="text-2xl text-[#81766d] transition hover:text-[#28231f] disabled:opacity-40"
              >
                ×
              </button>

            </div>

            {/* File picker */}

            <label
              className={`mt-8 flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#28231f]/20 bg-[#ebe4da] px-6 text-center transition hover:border-[#8b4b3f]/50 ${
                selectedFiles.length > 0
                  ? "border-[#8b4b3f]"
                  : ""
              }`}
            >

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/webm,video/quicktime"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={
                  handleFileSelection
                }
              />

              {selectedFiles.length > 0 ? (
                <>

                  <div className="font-serif text-4xl text-[#8b4b3f]">
                    ✓
                  </div>

                  <p className="mt-4 font-serif text-xl text-[#28231f]">
                    {selectedFiles.length}{" "}
                    {selectedFiles.length ===
                    1
                      ? "file"
                      : "files"}{" "}
                    selected
                  </p>

                  <p className="mt-2 text-xs text-[#81766d]">
                    Click to choose more
                  </p>

                  <p className="mt-4 text-[9px] uppercase tracking-[0.2em] text-[#8b4b3f]">
                    Images and videos will be
                    uploaded one by one
                  </p>

                </>
              ) : (
                <>

                  <div className="font-serif text-5xl text-[#5d3928]/30">
                    ♡
                  </div>

                  <p className="mt-5 font-serif text-xl text-[#28231f]">
                    Choose pictures or videos
                  </p>

                  <p className="mt-2 text-xs text-[#81766d]">
                    You can select multiple files
                  </p>

                  <p className="mt-3 text-[9px] uppercase tracking-[0.15em] text-[#81766d]/70">
                    Images · max 10 MB
                    <br />
                    Videos · max 100 MB
                  </p>

                </>
              )}

            </label>

            {/* ======================================================
                SELECTED FILES
            ====================================================== */}

            {selectedFiles.length > 0 && (
              <div className="mt-5 max-h-[180px] overflow-y-auto rounded-xl bg-[#ebe4da] p-3">

                <div className="space-y-2">

                  {selectedFiles.map(
                    (file, index) => {

                      const isVideo =
                        file.type.startsWith(
                          "video/"
                        );

                      return (
                        <div
                          key={`${file.name}-${file.size}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-lg bg-[#f4f0ea] px-3 py-2.5"
                        >

                          <div className="min-w-0">

                            <div className="flex items-center gap-2">

                              <span className="text-sm">
                                {isVideo
                                  ? "🎥"
                                  : "🖼️"}
                              </span>

                              <p className="truncate text-xs font-medium text-[#28231f]">
                                {file.name}
                              </p>

                            </div>

                            <p className="mt-0.5 pl-6 text-[9px] text-[#81766d]">
                              {(
                                file.size /
                                1024 /
                                1024
                              ).toFixed(2)}{" "}
                              MB
                            </p>

                          </div>

                          <button
                            type="button"
                            disabled={uploading}
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
                    {uploadProgress}%
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
                  Please keep this window open
                </p>

              </div>
            )}

            {/* ======================================================
                ERROR
            ====================================================== */}

            {uploadError && (
              <div className="mt-4 rounded-lg bg-[#9f3f4d]/5 px-4 py-3">

                <p className="text-center text-xs leading-6 text-[#9f3f4d]">
                  {uploadError}
                </p>

              </div>
            )}

            {/* ======================================================
                BUTTONS
            ====================================================== */}

            <div className="mt-7 flex gap-3">

              <button
                type="button"
                disabled={uploading}
                onClick={closeAddForm}
                className="flex-1 rounded-full border border-[#28231f]/15 px-5 py-3.5 text-[10px] font-medium uppercase tracking-[0.2em] text-[#5d3928] transition hover:bg-[#ebe4da] disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  selectedFiles.length ===
                    0 ||
                  uploading
                }
                onClick={handleUpload}
                className="flex-1 rounded-full bg-[#5d3928] px-5 py-3.5 text-[10px] font-medium uppercase tracking-[0.2em] !text-white transition hover:bg-[#8b4b3f] disabled:cursor-not-allowed disabled:opacity-40"
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
                  : "Add media"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* FOOTER                                                       */}
      {/* ============================================================ */}

      <footer className="border-t border-black/[0.06] px-5 py-12 text-center">

        <p className="text-[9px] uppercase tracking-[0.3em] text-[#81766d]">
          Her style ♡
        </p>

      </footer>

    </main>
  );
}
