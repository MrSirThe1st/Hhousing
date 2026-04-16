"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Listing } from "@hhousing/domain";
import type { ManagerListingView } from "@hhousing/api-contracts";
import { postWithAuth } from "../lib/api-client";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";
import UniversalLoadingState from "./universal-loading-state";

interface ListingEditorFormProps {
  organizationId: string;
  currentScopeLabel: string;
  item: ManagerListingView;
}

interface ListingFormState {
  marketingDescription: string;
  coverImageUrl: string;
  galleryImageUrls: string[];
  youtubeUrl: string;
  instagramUrl: string;
  contactEmail: string;
  contactPhone: string;
  showAddress: boolean;
  showRent: boolean;
  showDeposit: boolean;
  showAmenities: boolean;
  showFeatures: boolean;
  showBedrooms: boolean;
  showBathrooms: boolean;
  showSizeSqm: boolean;
}

interface PendingImageUpload {
  id: string;
  file: File;
  previewUrl: string;
}

function buildInitialListingForm(item: ManagerListingView): ListingFormState {
  const fallbackPropertyPhotos = item.property.photoUrls;

  return {
    marketingDescription: item.listing?.marketingDescription ?? "",
    coverImageUrl: item.listing?.coverImageUrl ?? fallbackPropertyPhotos[0] ?? "",
    galleryImageUrls: item.listing?.galleryImageUrls ?? fallbackPropertyPhotos,
    youtubeUrl: item.listing?.youtubeUrl ?? "",
    instagramUrl: item.listing?.instagramUrl ?? "",
    contactEmail: item.listing?.contactEmail ?? "",
    contactPhone: item.listing?.contactPhone ?? "",
    showAddress: item.listing?.visibility.showAddress ?? false,
    showRent: item.listing?.visibility.showRent ?? true,
    showDeposit: item.listing?.visibility.showDeposit ?? true,
    showAmenities: item.listing?.visibility.showAmenities ?? true,
    showFeatures: item.listing?.visibility.showFeatures ?? true,
    showBedrooms: item.listing?.visibility.showBedrooms ?? true,
    showBathrooms: item.listing?.visibility.showBathrooms ?? true,
    showSizeSqm: item.listing?.visibility.showSizeSqm ?? true
  };
}

function formatCurrency(amount: number, currencyCode: string): string {
  return `${amount.toLocaleString("fr-FR")} ${currencyCode}`;
}

function buildUploadId(file: File): string {
  return `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 10)}`;
}

function createPendingImageUpload(file: File): PendingImageUpload {
  return {
    id: buildUploadId(file),
    file,
    previewUrl: URL.createObjectURL(file)
  };
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export default function ListingEditorForm({
  organizationId,
  currentScopeLabel,
  item
}: ListingEditorFormProps): React.ReactElement {
  const router = useRouter();
  const propertyPhotos = item.property.photoUrls;
  const [form, setForm] = useState<ListingFormState>(() => buildInitialListingForm(item));
  const [coverUpload, setCoverUpload] = useState<PendingImageUpload | null>(null);
  const [galleryUploads, setGalleryUploads] = useState<PendingImageUpload[]>([]);
  const [busyAction, setBusyAction] = useState<"draft" | "published" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isRoutePending, startRouteTransition] = useTransition();
  const isSubmitting = busyAction !== null || isRoutePending;

  useEffect(() => {
    return () => {
      if (coverUpload) {
        URL.revokeObjectURL(coverUpload.previewUrl);
      }

      galleryUploads.forEach((upload) => {
        URL.revokeObjectURL(upload.previewUrl);
      });
    };
  }, [coverUpload, galleryUploads]);

  async function uploadImage(file: File, slot: string): Promise<string> {
    const supabase = createSupabaseBrowserClient();
    const safeName = file.name.replace(/\s+/g, "-");
    const filePath = `${organizationId}/listing-media/${item.unit.id}/${Date.now()}-${slot}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);

    if (uploadError) {
      if (uploadError.message.toLowerCase().includes("row-level security policy")) {
        throw new Error(
          "Upload bloque par Supabase Storage RLS. Ajoutez une policy INSERT pour le bucket 'documents' (role authenticated)."
        );
      }

      throw new Error(`Erreur de telechargement: ${uploadError.message}`);
    }

    const {
      data: { publicUrl }
    } = supabase.storage.from("documents").getPublicUrl(filePath);

    return publicUrl;
  }

  function handleCoverSelection(event: React.ChangeEvent<HTMLInputElement>): void {
    const selectedFile = event.target.files?.[0] ?? null;
    if (!selectedFile) {
      return;
    }

    if (!isImageFile(selectedFile)) {
      setError("Le visuel de couverture doit etre une image.");
      return;
    }

    setError(null);
    setMessage(null);
    setCoverUpload((current) => {
      if (current) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return createPendingImageUpload(selectedFile);
    });
  }

  function handleGallerySelection(event: React.ChangeEvent<HTMLInputElement>): void {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) {
      return;
    }

    if (selectedFiles.some((file) => !isImageFile(file))) {
      setError("Toutes les images de galerie doivent etre des fichiers image.");
      return;
    }

    setError(null);
    setMessage(null);
    setGalleryUploads((current) => [...current, ...selectedFiles.map(createPendingImageUpload)]);
  }

  function removeCurrentCover(): void {
    setMessage(null);
    setError(null);

    if (coverUpload) {
      URL.revokeObjectURL(coverUpload.previewUrl);
      setCoverUpload(null);
      return;
    }

    setForm((current) => ({ ...current, coverImageUrl: "" }));
  }

  function removeExistingGalleryImage(imageUrl: string): void {
    setMessage(null);
    setError(null);
    setForm((current) => ({
      ...current,
      galleryImageUrls: current.galleryImageUrls.filter((value) => value !== imageUrl)
    }));
  }

  function removePendingGalleryImage(uploadId: string): void {
    setMessage(null);
    setError(null);
    setGalleryUploads((current) => {
      const upload = current.find((entry) => entry.id === uploadId);
      if (upload) {
        URL.revokeObjectURL(upload.previewUrl);
      }

      return current.filter((entry) => entry.id !== uploadId);
    });
  }

  function setCoverFromProperty(imageUrl: string): void {
    setError(null);
    setMessage(null);

    setCoverUpload((current) => {
      if (current) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return null;
    });

    setForm((current) => ({ ...current, coverImageUrl: imageUrl }));
  }

  function togglePropertyGalleryImage(imageUrl: string): void {
    setError(null);
    setMessage(null);
    setForm((current) => ({
      ...current,
      galleryImageUrls: current.galleryImageUrls.includes(imageUrl)
        ? current.galleryImageUrls.filter((value) => value !== imageUrl)
        : [...current.galleryImageUrls, imageUrl]
    }));
  }

  function useAllPropertyPhotos(): void {
    if (propertyPhotos.length === 0) {
      return;
    }

    setError(null);
    setMessage(null);
    setCoverUpload((current) => {
      if (current) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return null;
    });
    setForm((current) => ({
      ...current,
      coverImageUrl: current.coverImageUrl || propertyPhotos[0],
      galleryImageUrls: Array.from(new Set([...current.galleryImageUrls, ...propertyPhotos]))
    }));
  }

  async function saveListing(status: "draft" | "published"): Promise<void> {
    setBusyAction(status);
    setError(null);
    setMessage(null);

    if (!form.coverImageUrl.trim() && coverUpload === null) {
      setError("Ajoutez une image de couverture avant d'enregistrer le listing.");
      setBusyAction(null);
      return;
    }

    if (form.galleryImageUrls.length + galleryUploads.length < 1) {
      setError("Ajoutez au moins une image de galerie avant d'enregistrer le listing.");
      setBusyAction(null);
      return;
    }

    let coverImageUrl = form.coverImageUrl.trim();
    let galleryImageUrls = [...form.galleryImageUrls];

    try {
      if (coverUpload) {
        coverImageUrl = await uploadImage(coverUpload.file, "cover");
      }

      if (galleryUploads.length > 0) {
        const uploadedGalleryUrls = await Promise.all(
          galleryUploads.map((upload, index) => uploadImage(upload.file, `gallery-${index + 1}`))
        );
        galleryImageUrls = [...galleryImageUrls, ...uploadedGalleryUrls];
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Erreur de telechargement des images.");
      setBusyAction(null);
      return;
    }

    const result = await postWithAuth<Listing>("/api/listings", {
      organizationId,
      propertyId: item.property.id,
      unitId: item.unit.id,
      status,
      marketingDescription: form.marketingDescription.trim() || null,
      coverImageUrl: coverImageUrl || null,
      galleryImageUrls,
      youtubeUrl: form.youtubeUrl.trim() || null,
      instagramUrl: form.instagramUrl.trim() || null,
      contactEmail: form.contactEmail.trim() || null,
      contactPhone: form.contactPhone.trim() || null,
      showAddress: form.showAddress,
      showRent: form.showRent,
      showDeposit: form.showDeposit,
      showAmenities: form.showAmenities,
      showFeatures: form.showFeatures,
      showBedrooms: form.showBedrooms,
      showBathrooms: form.showBathrooms,
      showSizeSqm: form.showSizeSqm
    });

    if (!result.success) {
      setError(result.error);
      setBusyAction(null);
      return;
    }

    setForm((current) => ({
      ...current,
      coverImageUrl: result.data.coverImageUrl ?? "",
      galleryImageUrls: result.data.galleryImageUrls
    }));
    setCoverUpload(null);
    setGalleryUploads([]);

    setMessage(status === "published" ? "Listing published." : "Draft saved.");
    setBusyAction(null);

    if (status === "published") {
      startRouteTransition(() => {
        router.push("/dashboard/listings?tab=listings");
      });

      return;
    }

    startRouteTransition(() => {
      router.refresh();
    });
  }

return (
  <div className="min-h-screen bg-slate-50">
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">

      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <Link
            href="/dashboard/listings?tab=listings"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to listings
          </Link>

          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            {item.listing ? "Edit listing" : "Create listing"}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {currentScopeLabel}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
          <p className="font-semibold text-slate-900">{item.property.name}</p>
          <p className="text-slate-500">
            Unit {item.unit.unitNumber} · {item.property.city}
          </p>
          <p className="mt-1 font-medium text-slate-700">
            {formatCurrency(item.unit.monthlyRentAmount, item.unit.currencyCode)} / month
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            void saveListing("draft");
          }}
          disabled={isSubmitting}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          Save edits
        </button>
        <button
          type="button"
          onClick={() => {
            void saveListing("published");
          }}
          disabled={isSubmitting}
          className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0052d4] disabled:opacity-60"
        >
          Publish listing
        </button>
      </div>

      <fieldset disabled={isSubmitting} className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6">

        {/* LEFT */}
        <section className="space-y-6">

          {/* PUBLIC CONTENT */}
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Public content</h2>
              <p className="mt-1 text-xs text-slate-500">
                This is what tenants will see on the listing page
              </p>
            </div>

            <div className="p-5 space-y-6">

              {/* DESCRIPTION */}
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Marketing description
                </label>

                <textarea
                  value={form.marketingDescription}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, marketingDescription: e.target.value }))
                  }
                  rows={6}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              {/* PROPERTY PHOTOS */}
              {propertyPhotos.length > 0 && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Property photos
                      </p>
                      <p className="text-xs text-slate-500">
                        Reuse existing property media
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={useAllPropertyPhotos}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                    >
                      Use all
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 xl:grid-cols-3 gap-3">
                    {propertyPhotos.map((imageUrl) => {
                      const isCover = form.coverImageUrl === imageUrl && !coverUpload;
                      const inGallery = form.galleryImageUrls.includes(imageUrl);

                      return (
                        <div
                          key={imageUrl}
                          className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white"
                        >
                          <div
                            className="aspect-4/3 bg-cover bg-center"
                            style={{ backgroundImage: `url(${imageUrl})` }}
                          />

                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />

                          <div className="absolute top-2 left-2 flex gap-2">
                            {isCover && (
                              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium">
                                Cover
                              </span>
                            )}
                            {inGallery && (
                              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium">
                                Gallery
                              </span>
                            )}
                          </div>

                          <div className="absolute bottom-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => setCoverFromProperty(imageUrl)}
                              className="rounded-md bg-white px-2 py-1 text-[11px] shadow"
                            >
                              Cover
                            </button>

                            <button
                              onClick={() => togglePropertyGalleryImage(imageUrl)}
                              className="rounded-md bg-white px-2 py-1 text-[11px] shadow"
                            >
                              Gallery
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* UPLOADS */}
              <div className="grid md:grid-cols-2 gap-4">

                {/* COVER */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-600">Cover image</p>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverSelection}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />

                  {(coverUpload || form.coverImageUrl) && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <div
                        className="aspect-4/3 bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${coverUpload?.previewUrl ?? form.coverImageUrl})`
                        }}
                      />

                      <div className="flex items-center justify-between px-3 py-2 text-xs">
                        <span className="truncate text-slate-500">
                          {coverUpload?.file.name ?? "Current cover"}
                        </span>

                        <button
                          onClick={removeCurrentCover}
                          className="text-red-600 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* GALLERY */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-600">Gallery images</p>

                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleGallerySelection}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />

                  {(form.galleryImageUrls.length || galleryUploads.length) ? (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {form.galleryImageUrls.map((url) => (
                        <div key={url} className="group relative overflow-hidden rounded-xl border">
                          <div
                            className="aspect-4/3 bg-cover bg-center"
                            style={{ backgroundImage: `url(${url})` }}
                          />
                          <button
                            onClick={() => removeExistingGalleryImage(url)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-xs bg-white px-2 py-1 rounded shadow"
                          >
                            Delete
                          </button>
                        </div>
                      ))}

                      {galleryUploads.map((upload) => (
                        <div key={upload.id} className="group relative overflow-hidden rounded-xl border">
                          <div
                            className="aspect-4/3 bg-cover bg-center"
                            style={{ backgroundImage: `url(${upload.previewUrl})` }}
                          />
                          <button
                            onClick={() => removePendingGalleryImage(upload.id)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-xs bg-white px-2 py-1 rounded shadow"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

              </div>

              {/* FEEDBACK */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {message}
                </div>
              )}

            </div>
          </div>

        </section>

        {/* RIGHT */}
        <section className="space-y-6">

          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold">Visibility</h2>
              <p className="text-xs text-slate-500 mt-1">
                Control tenant-facing data
              </p>
            </div>

            <div className="p-5 space-y-3">
              {[
                ["showAddress", "Address"],
                ["showRent", "Rent"],
                ["showDeposit", "Deposit"],
                ["showAmenities", "Amenities"],
                ["showFeatures", "Features"],
                ["showBedrooms", "Bedrooms"],
                ["showBathrooms", "Bathrooms"],
                ["showSizeSqm", "Size"]
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
                >
                  {label}
                  <input
                    type="checkbox"
                    checked={form[key as keyof ListingFormState] as boolean}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, [key]: e.target.checked }))
                    }
                  />
                </label>
              ))}
            </div>
          </div>

        </section>

      </fieldset>

      {isSubmitting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a19]/35 backdrop-blur-[1px]">
          <UniversalLoadingState minHeightClassName="min-h-0" className="h-full w-full" />
        </div>
      ) : null}
    </div>
  </div>
);
}