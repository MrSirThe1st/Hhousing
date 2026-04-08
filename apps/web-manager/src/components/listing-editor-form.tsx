"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Listing } from "@hhousing/domain";
import type { ManagerListingView } from "@hhousing/api-contracts";
import { postWithAuth } from "../lib/api-client";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

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
    router.refresh();

    if (status === "published") {
      router.push("/dashboard/listings?tab=listings");
    }
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/listings?tab=listings" className="text-sm font-semibold text-[#0063fe] hover:underline">
            ← Back to listings
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-[#010a19]">
            {item.listing ? "Edit listing" : "Create listing"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Affichage courant: {currentScopeLabel}</p>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Build the public version of this unit on a separate page, then either save it as a draft or publish it.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          <p className="font-semibold text-slate-900">{item.property.name}</p>
          <p className="mt-1">Unit {item.unit.unitNumber} · {item.property.city}</p>
          <p className="mt-1">{formatCurrency(item.unit.monthlyRentAmount, item.unit.currencyCode)} / month</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Public content</h2>
            <p className="mt-1 text-sm text-slate-500">
              Reuse property photos for the listing when available, or upload listing-specific images if you need different visuals.
            </p>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1.5 block">Marketing description</span>
            <textarea
              value={form.marketingDescription}
              onChange={(event) => setForm((current) => ({ ...current, marketingDescription: event.target.value }))}
              className="min-h-32 w-full rounded-2xl border border-slate-300 px-4 py-3"
            />
          </label>

          {propertyPhotos.length > 0 ? (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Property photos</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Reuse the existing property media for this listing. Choose one for the cover and one or more for the gallery.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={useAllPropertyPhotos}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Use all property photos
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {propertyPhotos.map((imageUrl) => {
                  const isCover = form.coverImageUrl === imageUrl && coverUpload === null;
                  const inGallery = form.galleryImageUrls.includes(imageUrl);

                  return (
                    <div key={imageUrl} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div
                        className="aspect-4/3 bg-slate-200"
                        style={{
                          backgroundImage: `url(${imageUrl})`,
                          backgroundPosition: "center",
                          backgroundSize: "cover"
                        }}
                      />
                      <div className="space-y-3 px-4 py-3 text-xs text-slate-500">
                        <div className="flex flex-wrap gap-2">
                          {isCover ? <span className="rounded-full bg-blue-100 px-2.5 py-1 font-semibold text-blue-700">Cover</span> : null}
                          {inGallery ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700">Gallery</span> : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setCoverFromProperty(imageUrl)}
                            className="rounded-full border border-slate-300 px-3 py-1.5 font-semibold text-slate-700"
                          >
                            {isCover ? "Selected as cover" : "Use as cover"}
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePropertyGalleryImage(imageUrl)}
                            className="rounded-full border border-slate-300 px-3 py-1.5 font-semibold text-slate-700"
                          >
                            {inGallery ? "Remove from gallery" : "Add to gallery"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Cover image</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {propertyPhotos.length > 0
                    ? "You can reuse a property photo above, or upload a different cover image here."
                    : "Upload exactly one image used as the main public visual."}
                </p>
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={handleCoverSelection}
                className="block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600"
              />

              {coverUpload || form.coverImageUrl ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div
                    className="aspect-4/3 bg-slate-200"
                    style={{
                      backgroundImage: `url(${coverUpload?.previewUrl ?? form.coverImageUrl})`,
                      backgroundPosition: "center",
                      backgroundSize: "cover"
                    }}
                  />
                  <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-500">
                    <span>{coverUpload ? `New file: ${coverUpload.file.name}` : "Current cover image"}</span>
                    <button
                      type="button"
                      onClick={removeCurrentCover}
                      className="font-semibold text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                  No cover image uploaded yet.
                </p>
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Gallery images</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {propertyPhotos.length > 0
                    ? "Reuse property photos above, and upload more only when the listing needs extra visuals."
                    : "Upload one or more images shown in the listing gallery."}
                </p>
              </div>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleGallerySelection}
                className="block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600"
              />

              {form.galleryImageUrls.length + galleryUploads.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {form.galleryImageUrls.map((imageUrl) => (
                    <div key={imageUrl} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div
                        className="aspect-4/3 bg-slate-200"
                        style={{
                          backgroundImage: `url(${imageUrl})`,
                          backgroundPosition: "center",
                          backgroundSize: "cover"
                        }}
                      />
                      <div className="flex items-center justify-end px-4 py-3 text-xs text-slate-500">
                        <button
                          type="button"
                          onClick={() => removeExistingGalleryImage(imageUrl)}
                          className="font-semibold text-rose-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {galleryUploads.map((upload) => (
                    <div key={upload.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div
                        className="aspect-4/3 bg-slate-200"
                        style={{
                          backgroundImage: `url(${upload.previewUrl})`,
                          backgroundPosition: "center",
                          backgroundSize: "cover"
                        }}
                      />
                      <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-500">
                        <span className="truncate">{upload.file.name}</span>
                        <button
                          type="button"
                          onClick={() => removePendingGalleryImage(upload.id)}
                          className="font-semibold text-rose-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                  No gallery images uploaded yet.
                </p>
              )}
            </div>
          </div>

          {propertyPhotos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              This property has no saved property photos yet, so add listing-specific images below.
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-1.5 block">Contact email</span>
              <input
                value={form.contactEmail}
                onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-1.5 block">Contact phone</span>
              <input
                value={form.contactPhone}
                onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-1.5 block">YouTube URL</span>
              <input
                value={form.youtubeUrl}
                onChange={(event) => setForm((current) => ({ ...current, youtubeUrl: event.target.value }))}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-1.5 block">Instagram URL</span>
              <input
                value={form.instagramUrl}
                onChange={(event) => setForm((current) => ({ ...current, instagramUrl: event.target.value }))}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3"
              />
            </label>
          </div>
        </section>

        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Visibility</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose what renters can see on the public listing page.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["showAddress", "Show address"],
              ["showRent", "Show rent"],
              ["showDeposit", "Show deposit"],
              ["showAmenities", "Show amenities"],
              ["showFeatures", "Show features"],
              ["showBedrooms", "Show bedrooms"],
              ["showBathrooms", "Show bathrooms"],
              ["showSizeSqm", "Show size"]
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(form[key as keyof ListingFormState])}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Current unit state</p>
            <p className="mt-2">Unit status: {item.unit.status}</p>
            <p className="mt-1">Listing status: {item.listing?.status ?? "not published yet"}</p>
            <p className="mt-2 text-xs text-slate-500">
              Publishing is only allowed for vacant units. Saving draft keeps your setup private until you publish.
            </p>
          </div>

          {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          {message ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => saveListing("draft")}
              disabled={busyAction !== null}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              {busyAction === "draft" ? "Saving..." : "Save as draft"}
            </button>
            <button
              type="button"
              onClick={() => saveListing("published")}
              disabled={busyAction !== null}
              className="rounded-full bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busyAction === "published" ? "Publishing..." : item.listing?.status === "published" ? "Update published listing" : "Publish listing"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}