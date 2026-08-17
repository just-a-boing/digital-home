"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import herImage from "@/assets/her.jpg";

type HerImage = {
  image_id: string;
  image_url: string;
};

type GalleryImage = HerImage & {
  signedUrl: string;
};

export default function HerPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  // ================================================================
  // ADD PICTURE FORM
  // ================================================================

  const [showAddForm, setShowAddForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Multiple files
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [uploadError, setUploadError] = useState<string | null>(null);

  // Upload progress
  const [uploadProgress, setUploadProgress] = useState(0);

  // ================================================================
  // GET STORAGE PATH
  // ================================================================
  //
  // Database should contain:
  //
  // her/images/xxxxxxxx.jpg
  //
  // This function also supports old rows that may contain a full
  // Supabase URL.
  //
  // ================================================================

  const getStoragePath = (value: string): string => {
    // Preferred format:
    // her/images/file.jpg
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

      // Remove:
      // public/
      // sign/
      // authenticated/
      path = path.replace(/^public\//, "");
      path = path.replace(/^sign\//, "");
      path = path.replace(/^authenticated\//, "");

      // Remove bucket name
      if (path.startsWith("media/")) {
        path = path.substring("media/".length);
      }

      return path;
    } catch {
      return value;
    }
  };

  // ================================================================
  // CREATE SIGNED URL
  // ================================================================
  //
  // Takes:
  //
  // her/images/file.jpg
  //
  // and creates a temporary URL for the PRIVATE bucket.
  //
  // The URL expires after 1 hour.
  //
  // ================================================================

  const createImageSignedUrl = async (
    storagePath: string
  ): Promise<string | null> => {
    const cleanPath = storagePath.trim();

    if (!cleanPath) {
      return null;
    }

    console.log(
      "Creating signed URL for storage path:",
      cleanPath
    );

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

    if (!data?.signedUrl) {
      console.error(
        "Supabase returned no signed URL for:",
        cleanPath
      );

      return null;
    }

    return data.signedUrl;
  };

  // ================================================================
  // LOAD IMAGES
  // ================================================================

  useEffect(() => {
    let mounted = true;

    const loadImages = async () => {
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
        // GET ROWS FROM DATABASE
        // ------------------------------------------------------------

        const {
          data,
          error,
        } = await supabase
          .from("her_images")
          .select("image_id, image_url")
          .order("image_id", {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        if (!mounted) {
          return;
        }

        // ------------------------------------------------------------
        // TURN STORAGE PATHS INTO TEMPORARY SIGNED URLS
        // ------------------------------------------------------------

        const galleryImages: GalleryImage[] = [];

        for (const image of data ?? []) {
          const storagePath = getStoragePath(
            image.image_url
          );

          const signedUrl =
            await createImageSignedUrl(
              storagePath
            );

          if (!signedUrl) {
            console.error(
              "Skipping image because signed URL could not be created:",
              {
                imageId: image.image_id,
                imageUrl: image.image_url,
                storagePath,
              }
            );

            continue;
          }

          galleryImages.push({
            image_id: image.image_id,
            image_url: image.image_url,
            signedUrl,
          });
        }

        if (mounted) {
          setImages(galleryImages);
        }
      } catch (error) {
        console.error(
          "Failed to load her images:",
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadImages();

    return () => {
      mounted = false;
    };
  }, []);

  // ================================================================
  // CLOSE ADD FORM
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
  // HANDLE FILE SELECTION
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
    // VALIDATE ALL SELECTED FILES BEFORE UPLOAD
    // ------------------------------------------------------------

    const invalidFile = files.find(
      (file) =>
        !file.type.startsWith("image/")
    );

    if (invalidFile) {
      setSelectedFiles([]);
      setUploadError(
        `"${invalidFile.name}" is not a valid image file.`
      );
      return;
    }

    const oversizedFile = files.find(
      (file) =>
        file.size > 10 * 1024 * 1024
    );

    if (oversizedFile) {
      setSelectedFiles([]);
      setUploadError(
        `"${oversizedFile.name}" is larger than 10 MB.`
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
  // UPLOAD ONE IMAGE
  // ================================================================
  //
  // This performs the exact same process your original code used:
  //
  // 1. Upload image to Supabase Storage
  // 2. Insert storage path into database
  // 3. Create signed URL
  // 4. Return image for frontend
  //
  // ================================================================

  const uploadSingleImage = async (
    selectedFile: File
  ): Promise<GalleryImage> => {
    let filePath: string | null = null;

    // ------------------------------------------------------------
    // CREATE STORAGE PATH
    // ------------------------------------------------------------

    const extension =
      selectedFile.name
        .split(".")
        .pop()
        ?.toLowerCase() || "jpg";

    const fileName =
      `${crypto.randomUUID()}.${extension}`;

    filePath =
      `her/images/${fileName}`;

    console.log(
      "Uploading to:",
      filePath
    );

    // ------------------------------------------------------------
    // UPLOAD TO PRIVATE BUCKET
    // ------------------------------------------------------------

    const {
      data: uploadData,
      error: storageError,
    } = await supabase.storage
      .from("media")
      .upload(
        filePath,
        selectedFile,
        {
          cacheControl: "3600",
          upsert: false,
          contentType:
            selectedFile.type,
        }
      );

    if (storageError) {
      console.error(
        "Supabase Storage upload error:",
        {
          file: selectedFile.name,
          message:
            storageError.message,
          error: storageError,
        }
      );

      throw new Error(
        `${selectedFile.name}: ${
          storageError.message ||
          "Unable to upload the image."
        }`
      );
    }

    console.log(
      "Storage upload successful:",
      uploadData
    );

    // ------------------------------------------------------------
    // SAVE ONLY STORAGE PATH TO DATABASE
    // ------------------------------------------------------------

    const {
      data: insertedImage,
      error: databaseError,
    } = await supabase
      .from("her_images")
      .insert({
        image_url: filePath,
      })
      .select(
        "image_id, image_url"
      )
      .single();

    if (databaseError) {
      console.error(
        "Database insert error:",
        {
          file: selectedFile.name,
          message:
            databaseError.message,
          error: databaseError,
        }
      );

      // Roll back storage upload
      await supabase.storage
        .from("media")
        .remove([filePath]);

      throw new Error(
        `${selectedFile.name}: ${
          databaseError.message ||
          "Image uploaded but database entry failed."
        }`
      );
    }

    console.log(
      "Database row created:",
      insertedImage
    );

    // ------------------------------------------------------------
    // CREATE TEMPORARY SIGNED URL
    // ------------------------------------------------------------

    const signedUrl =
      await createImageSignedUrl(
        filePath
      );

    if (!signedUrl) {
      throw new Error(
        `${selectedFile.name}: Image uploaded successfully, but a temporary image URL could not be created.`
      );
    }

    console.log(
      "Temporary image URL created:",
      selectedFile.name
    );

    // ------------------------------------------------------------
    // RETURN COMPLETE GALLERY IMAGE
    // ------------------------------------------------------------

    return {
      image_id:
        insertedImage.image_id,
      image_url:
        insertedImage.image_url,
      signedUrl,
    };
  };

  // ================================================================
  // UPLOAD ALL SELECTED IMAGES
  // ================================================================
  //
  // IMPORTANT:
  //
  // Images are intentionally uploaded ONE BY ONE.
  //
  // Image 1:
  // Storage -> Database -> Signed URL -> Frontend
  //
  // Image 2:
  // Storage -> Database -> Signed URL -> Frontend
  //
  // etc.
  //
  // ================================================================

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadError(
        "Please choose at least one image."
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

      // ------------------------------------------------------------
      // VALIDATE AGAIN
      // ------------------------------------------------------------

      const invalidFile =
        selectedFiles.find(
          (file) =>
            !file.type.startsWith("image/")
        );

      if (invalidFile) {
        throw new Error(
          `"${invalidFile.name}" is not a valid image file.`
        );
      }

      const oversizedFile =
        selectedFiles.find(
          (file) =>
            file.size >
            10 * 1024 * 1024
        );

      if (oversizedFile) {
        throw new Error(
          `"${oversizedFile.name}" is larger than 10 MB.`
        );
      }

      // ------------------------------------------------------------
      // UPLOAD ONE BY ONE
      // ------------------------------------------------------------

      const totalFiles =
        selectedFiles.length;

      const failedFiles: string[] = [];

      for (
        let index = 0;
        index < totalFiles;
        index++
      ) {
        const file =
          selectedFiles[index];

        console.log(
          `Uploading ${index + 1} of ${totalFiles}:`,
          file.name
        );

        try {
          const galleryImage =
            await uploadSingleImage(
              file
            );

          // --------------------------------------------------------
          // ADD THIS IMAGE IMMEDIATELY TO THE FRONTEND
          // --------------------------------------------------------

          setImages((current) => [
            galleryImage,
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

        // ----------------------------------------------------------
        // UPDATE PROGRESS AFTER EACH IMAGE
        // ----------------------------------------------------------

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
          `${failedFiles.length} image${
            failedFiles.length === 1
              ? ""
              : "s"
          } could not be uploaded: ${failedFiles.join(
            ", "
          )}`
        );

        // Keep successful files cleared from the selection.
        // The failed files remain selected so the user can retry.
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
      // EVERYTHING SUCCESSFUL
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

      let message =
        "Unable to upload the images.";

      if (error instanceof Error) {
        message = error.message;
      } else if (
        typeof error === "object" &&
        error !== null
      ) {
        try {
          message =
            JSON.stringify(error);
        } catch {
          message =
            "Unable to upload the images.";
        }
      }

      setUploadError(message);
    } finally {
      setUploading(false);
    }
  };

  // ================================================================
  // LOADING SCREEN
  // ================================================================

  if (loading) {
    return (
      <main className="flex min-h-[100svh] items-center justify-center bg-[#f4f0ea]">
        <div className="text-center">
          <div className="mb-4 font-serif text-4xl text-[#5d3928]/40">
            ♡
          </div>

          <p className="text-[10px] uppercase tracking-[0.3em] text-[#81766d]">
            Opening her collection...
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
          src={herImage}
          alt="Her"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-black/25" />

        <a
          href="/"
          className="absolute left-5 top-6 z-20 text-[10px] font-medium uppercase tracking-[0.25em] text-white/80 transition hover:text-white sm:left-10 sm:top-8"
        >
          ← Our Home
        </a>

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center text-white">

          <p className="text-[10px] uppercase tracking-[0.35em] text-white/80 sm:text-xs">
            A collection of her
          </p>

          <h1 className="mt-5 font-serif text-7xl tracking-tight sm:text-8xl md:text-9xl">
            Her
          </h1>

          <div className="mt-7 h-px w-12 bg-white/70" />

          <p className="mt-6 max-w-md text-sm leading-7 text-white/80 sm:text-base">
            Little moments, little details,
            <br />
            and all the things that make her,
            her.
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

      <section className="w-full px-5 pb-14 pt-20 sm:px-10 sm:pb-20 sm:pt-28">

        <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">

          <p className="text-[10px] uppercase tracking-[0.3em] text-[#8b4b3f]">
            Her collection
          </p>

          <h2 className="mt-4 font-serif text-4xl sm:text-5xl">
            A little bit of her
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#81766d]">
            Every picture holds a little piece
            of a moment.
            <br />
            Every moment holds a little piece
            of her.
          </p>

        </div>

      </section>

      {/* ============================================================ */}
      {/* EMPTY                                                        */}
      {/* ============================================================ */}

      {images.length === 0 && (
        <section className="flex min-h-[40vh] flex-col items-center justify-center px-5 py-24 text-center">

          <div className="font-serif text-6xl text-[#5d3928]/25">
            ♡
          </div>

          <h2 className="mt-7 font-serif text-3xl sm:text-4xl">
            Her collection is waiting.
          </h2>

          <p className="mt-4 max-w-md text-center text-sm leading-7 text-[#81766d]">
            There are no pictures here yet.
            <br />
            Maybe the first one belongs here.
          </p>

        </section>
      )}

      {/* ============================================================ */}
      {/* GALLERY                                                      */}
      {/* ============================================================ */}

      {images.length > 0 && (
        <section className="px-5 pb-24 sm:px-8 sm:pb-36 lg:px-12">

          <div className="mx-auto w-full max-w-7xl">

            <div className="columns-2 gap-4 sm:columns-3 lg:columns-3 xl:columns-4">

              {images.map((image, index) => (
                <div
                  key={image.image_id}
                  className="mb-4 break-inside-avoid"
                >

                  <div
                    className={`
                      group
                      relative
                      overflow-hidden
                      rounded-[3px]
                      bg-[#e5ddd3]
                      shadow-[0_4px_20px_rgba(60,40,30,0.05)]
                      transition-all
                      duration-700
                      hover:-translate-y-1
                      hover:shadow-[0_12px_35px_rgba(60,40,30,0.10)]
                      ${
                        index % 7 === 0
                          ? "sm:rounded-[5px]"
                          : ""
                      }
                    `}
                  >

                    <img
                      src={image.signedUrl}
                      alt="Her"
                      loading={
                        index < 6
                          ? "eager"
                          : "lazy"
                      }
                      className="
                        block
                        h-auto
                        w-full
                        object-contain
                        transition-transform
                        duration-700
                        ease-out
                        group-hover:scale-[1.025]
                      "
                    />

                    <div
                      className="
                        pointer-events-none
                        absolute
                        inset-0
                        bg-black/0
                        transition
                        duration-500
                        group-hover:bg-black/[0.025]
                      "
                    />

                  </div>

                </div>
              ))}

            </div>

          </div>

        </section>
      )}

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
              Add pictures
            </span>

            <span className="text-base !text-white">
              →
            </span>
          </button>

        </div>

      </section>

      {/* ============================================================ */}
      {/* ADD PICTURE MODAL                                             */}
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
                  Her collection
                </p>

                <h2 className="mt-2 font-serif text-3xl text-[#28231f]">
                  Add pictures
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

            {/* ====================================================== */}
            {/* FILE PICKER                                             */}
            {/* ====================================================== */}

            <label
              className={`mt-8 flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#28231f]/20 bg-[#ebe4da] px-6 text-center transition hover:border-[#8b4b3f]/50 ${
                selectedFiles.length > 0
                  ? "border-[#8b4b3f]"
                  : ""
              }`}
            >

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
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
                      ? "picture"
                      : "pictures"}{" "}
                    selected
                  </p>

                  <p className="mt-2 text-xs text-[#81766d]">
                    Click to choose more
                  </p>

                  <p className="mt-4 text-[9px] uppercase tracking-[0.2em] text-[#8b4b3f]">
                    All pictures will be uploaded one by one
                  </p>
                </>
              ) : (
                <>
                  <div className="font-serif text-5xl text-[#5d3928]/30">
                    ♡
                  </div>

                  <p className="mt-5 font-serif text-xl text-[#28231f]">
                    Choose pictures
                  </p>

                  <p className="mt-2 text-xs text-[#81766d]">
                    You can select multiple pictures
                  </p>

                  <p className="mt-3 text-[9px] uppercase tracking-[0.15em] text-[#81766d]/70">
                    JPG, PNG, WebP or HEIC · Maximum 10 MB each
                  </p>
                </>
              )}

            </label>

            {/* ====================================================== */}
            {/* SELECTED FILES                                          */}
            {/* ====================================================== */}

            {selectedFiles.length > 0 && (
              <div className="mt-5 max-h-[180px] overflow-y-auto rounded-xl bg-[#ebe4da] p-3">

                <div className="space-y-2">

                  {selectedFiles.map(
                    (file, index) => (
                      <div
                        key={`${file.name}-${file.size}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-lg bg-[#f4f0ea] px-3 py-2.5"
                      >

                        <div className="min-w-0">

                          <p className="truncate text-xs font-medium text-[#28231f]">
                            {file.name}
                          </p>

                          <p className="mt-0.5 text-[9px] text-[#81766d]">
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
                    )
                  )}

                </div>

              </div>
            )}

            {/* ====================================================== */}
            {/* UPLOAD PROGRESS                                         */}
            {/* ====================================================== */}

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

            {/* ====================================================== */}
            {/* ERROR                                                   */}
            {/* ====================================================== */}

            {uploadError && (
              <div className="mt-4 rounded-lg bg-[#9f3f4d]/5 px-4 py-3">

                <p className="text-center text-xs leading-6 text-[#9f3f4d]">
                  {uploadError}
                </p>

              </div>
            )}

            {/* ====================================================== */}
            {/* BUTTONS                                                 */}
            {/* ====================================================== */}

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
                        ? "picture"
                        : "pictures"
                    }`
                  : "Add pictures"}
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
          Just her ♡
        </p>

      </footer>

    </main>
  );
}