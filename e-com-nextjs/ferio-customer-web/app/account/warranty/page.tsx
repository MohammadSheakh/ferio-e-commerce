"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import type {
  UploadedWarrantyEvidence,
  WarrantyClaim,
  WarrantyOrderItem,
} from "@/lib/warranty";
import { formatWarrantyStatus, warrantyStatusClass } from "@/lib/warranty";

const fieldClass =
  "mt-1.5 w-full rounded-card border border-line bg-paper px-4 py-3 text-[14px] text-ink focus-visible:border-ink focus-visible:outline-none";
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 5 * 1024 * 1024;

function validateImages(files: File[]) {
  if (files.length < 1 || files.length > 5)
    return "Choose between one and five product images.";
  if (files.some((file) => !allowedImageTypes.has(file.type)))
    return "Use only JPG, PNG, or WebP images.";
  if (files.some((file) => file.size > maxImageBytes))
    return "Each product image must be 5 MB or smaller.";
  return "";
}

function WarrantyContent() {
  const searchParams = useSearchParams();
  const paramReference = searchParams.get("reference") || "";
  const paramPhone = searchParams.get("phone") || "";
  const paramItemId = searchParams.get("itemId") || "";

  const [reference, setReference] = useState(paramReference);
  const [phone, setPhone] = useState(paramPhone);
  const [verifiedReference, setVerifiedReference] = useState("");
  const [items, setItems] = useState<WarrantyOrderItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState(paramItemId);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [operationError, setOperationError] = useState("");
  const [notice, setNotice] = useState("");

  const loadClaims = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/warranty/claims/mine", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: WarrantyClaim[];
        message?: string;
      };
      if (response.status === 401) {
        setUnauthorized(true);
        return;
      }
      if (!response.ok || !payload.data)
        throw new Error(payload.message || "Unable to load warranty claims.");
      setClaims(payload.data);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load warranty claims.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClaims();
  }, [loadClaims]);

  const runVerification = useCallback(
    async (refVal: string, phoneVal: string, targetItemId?: string) => {
      if (!refVal || !phoneVal) return;
      setVerifying(true);
      setOperationError("");
      setNotice("");
      try {
        const response = await fetch("/api/warranty/order-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference: refVal.normalize("NFKC").trim(),
            phone: phoneVal.normalize("NFKC").trim(),
          }),
        });
        const payload = (await response.json()) as {
          data?: { reference: string; items: WarrantyOrderItem[] };
          message?: string;
        };
        if (!response.ok || !payload.data)
          throw new Error(payload.message || "Unable to verify that order.");
        setVerifiedReference(payload.data.reference);
        setItems(payload.data.items);

        // Pre-select item matching targetItemId, or default to single item / first item
        const matchItem = targetItemId
          ? payload.data.items.find((i) => i.id === targetItemId)
          : null;
        setSelectedItemId(matchItem?.id ?? payload.data.items[0]?.id ?? "");

        setNotice(
          payload.data.items.length === 1
            ? "Delivered order verified. Single item automatically selected below."
            : "Delivered order verified. Select the affected item below and upload evidence.",
        );
      } catch (error) {
        setItems([]);
        setSelectedItemId("");
        setVerifiedReference("");
        setOperationError(
          error instanceof Error ? error.message : "Unable to verify that order.",
        );
      } finally {
        setVerifying(false);
      }
    },
    [],
  );

  // Auto-verify if reference & phone are supplied via URL query parameters
  useEffect(() => {
    if (paramReference && paramPhone) {
      setReference(paramReference);
      setPhone(paramPhone);
      void runVerification(paramReference, paramPhone, paramItemId);
    }
  }, [paramReference, paramPhone, paramItemId, runVerification]);

  async function verifyOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runVerification(reference, phone, paramItemId);
  }

  async function submitClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const images = data
      .getAll("images")
      .filter(
        (value): value is File => value instanceof File && value.size > 0,
      );
    const imageError = validateImages(images);
    if (imageError) return setOperationError(imageError);
    if (!selectedItemId)
      return setOperationError("Select the affected order item.");

    setSubmitting(true);
    setOperationError("");
    setNotice("");
    try {
      const uploadBody = new FormData();
      images.forEach((image) => uploadBody.append("images", image));
      const uploadResponse = await fetch("/api/warranty/evidence/upload", {
        method: "POST",
        body: uploadBody,
      });
      const uploadPayload = (await uploadResponse.json()) as {
        data?: UploadedWarrantyEvidence[];
        message?: string;
      };
      if (!uploadResponse.ok || !uploadPayload.data)
        throw new Error(
          uploadPayload.message || "Unable to upload warranty evidence.",
        );

      const response = await fetch("/api/warranty/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: verifiedReference,
          phone: phone.normalize("NFKC").trim(),
          orderItemId: selectedItemId,
          issueDescription: data.get("issueDescription"),
          evidence: uploadPayload.data,
        }),
      });
      const payload = (await response.json()) as {
        data?: WarrantyClaim;
        message?: string;
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.message || "Unable to submit warranty claim.");

      setNotice(`Warranty claim ${payload.data.reference} submitted successfully.`);
      form.reset();
      setReference("");
      setPhone("");
      setVerifiedReference("");
      setItems([]);
      setSelectedItemId("");
      setSelectedFileNames([]);
      await loadClaims();
    } catch (error) {
      setOperationError(
        error instanceof Error
          ? error.message
          : "Unable to submit warranty claim.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (unauthorized) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20">
        <p className="text-[11px] uppercase tracking-eyebrow text-ink2">
          After-sales support
        </p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink">
          Warranty claims
        </h1>
        <p className="mt-3 text-[13px] leading-6 text-ink2">
          Sign in to verify a delivered order, submit product evidence, and
          review your warranty claim history.
        </p>
        <Link
          href="/account/login?next=/account/warranty"
          className="mt-7 inline-block rounded-full bg-ink px-6 py-3 text-[13px] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Sign in
        </Link>
      </main>
    );
  }

  const selectedItemObj = items.find((i) => i.id === selectedItemId);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-14">
      <nav aria-label="Breadcrumb" className="flex text-[12px] text-ink2">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/account" className="hover:text-ink">
          Account
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">Warranty</span>
      </nav>

      <header className="mt-7 max-w-3xl">
        <p className="text-[11px] uppercase tracking-eyebrow text-ink2">
          After-sales support
        </p>
        <h1 className="mt-2 text-[30px] font-semibold tracking-tight text-ink">
          Warranty claims
        </h1>
        <p className="mt-3 text-[13px] leading-6 text-ink2">
          Warranty claims are processed per individual item. Verify the delivered
          order, select the specific product item, describe the issue, and upload
          evidence images.
        </p>
        <Link
          href="/account/orders"
          className="mt-4 inline-block text-[12px] text-ink underline decoration-line underline-offset-4"
        >
          Find an order reference from your history
        </Link>
      </header>

      <section className="mt-10 border-y border-line py-7">
        <div>
          <h2 className="text-[18px] font-medium text-ink">
            1. Verify delivered order
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-ink2">
            Use the exact order reference and checkout phone from the delivered
            purchase.
          </p>
        </div>
        <form onSubmit={verifyOrder} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-[12px] text-ink2">
            Order reference
            <input
              required
              minLength={6}
              maxLength={64}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-[12px] text-ink2">
            Checkout phone
            <input
              required
              maxLength={32}
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={fieldClass}
            />
          </label>
          <div className="sm:col-span-2">
            <button
              disabled={verifying}
              className="rounded-full bg-ink px-5 py-2.5 text-[13px] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40"
            >
              {verifying ? "Verifying…" : "Verify delivered order"}
            </button>
          </div>
        </form>
      </section>

      {items.length > 0 && (
        <section className="border-b border-line py-7">
          <h2 className="text-[18px] font-medium text-ink">
            2. Select Item & Add Evidence
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-ink2">
            Verified order <strong className="text-ink">{verifiedReference}</strong>.
            {items.length === 1
              ? " Single item order — item selected."
              : ` Order contains ${items.length} items. Select the specific item experiencing issue.`}
          </p>
          <form onSubmit={submitClaim} className="mt-5">
            <fieldset>
              <legend className="text-[12px] font-semibold text-ink uppercase tracking-wider mb-2">
                {items.length === 1
                  ? "Claim Item"
                  : `Select Affected Order Item (${items.length} Items)`}
              </legend>

              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {items.map((item) => {
                  const isSelected = selectedItemId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`relative flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all ${
                        isSelected
                          ? "border-ink bg-surface shadow-xs ring-1 ring-ink"
                          : "border-line bg-paper hover:border-ink/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="orderItemId"
                        value={item.id}
                        checked={isSelected}
                        onChange={() => setSelectedItemId(item.id)}
                        className="accent-ink shrink-0"
                      />
                      <span className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface border border-line/60">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium text-ink truncate">
                          {item.productName}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-ink2">
                          {item.variantName} · SKU: {item.sku}
                        </span>
                        <span className="mt-1 inline-block text-[10px] font-semibold text-ink2 bg-white px-2 py-0.5 rounded border border-line">
                          Qty: {item.quantity}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="absolute top-2.5 right-2.5 text-xs text-emerald-600 font-bold">
                          ✓ Selected
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>

            {selectedItemObj && (
              <div className="mt-4 rounded-xl border border-line bg-surface p-3.5 text-xs">
                <p className="font-semibold text-ink">
                  🛡️ Claiming warranty for item:
                </p>
                <p className="text-ink2 mt-0.5">
                  <strong className="text-ink">{selectedItemObj.productName}</strong> (
                  {selectedItemObj.variantName}) · SKU: {selectedItemObj.sku}
                </p>
              </div>
            )}

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <label className="text-[12px] text-ink2">
                Detailed issue
                <textarea
                  name="issueDescription"
                  required
                  minLength={20}
                  maxLength={3000}
                  rows={7}
                  placeholder="Describe the fault with this specific item, when it started, and troubleshooting attempted."
                  className={fieldClass}
                />
              </label>
              <label className="text-[12px] text-ink2">
                Product evidence images
                <input
                  name="images"
                  required
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  type="file"
                  onChange={(event) =>
                    setSelectedFileNames(
                      Array.from(event.target.files ?? [], (file) => file.name),
                    )
                  }
                  className={fieldClass}
                />
                <span className="mt-2 block text-[11px] leading-5 text-ink2">
                  One to five JPG, PNG, or WebP images showing the defect/item. Max 5 MB each.
                  {selectedFileNames.length > 0 &&
                    ` Selected: ${selectedFileNames.join(", ")}.`}
                </span>
              </label>
            </div>
            <button
              disabled={submitting}
              className="mt-6 rounded-full bg-ink px-6 py-3 text-[13px] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40"
            >
              {submitting
                ? "Uploading evidence & submitting claim…"
                : `Submit warranty claim for selected item`}
            </button>
          </form>
        </section>
      )}

      {operationError && (
        <p role="alert" className="mt-5 text-[13px] text-rose-700 font-medium">
          {operationError}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-5 text-[13px] text-emerald-700 font-medium">
          {notice}
        </p>
      )}

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 className="text-[18px] font-medium text-ink">Your submitted claims</h2>
            <p className="mt-1 text-[12px] text-ink2">
              {claims.length} submitted item claim{claims.length === 1 ? "" : "s"}
            </p>
          </div>
          <Link
            href="/account"
            className="text-[12px] text-ink2 underline underline-offset-4"
          >
            Back to account
          </Link>
        </div>

        {loadError && (
          <div
            role="alert"
            className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700"
          >
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => void loadClaims()}
              className="rounded-full border border-rose-200 px-3 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        <div className="divide-y divide-line">
          {claims.map((claim) => (
            <article key={claim.id} className="py-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[14px] font-medium text-ink">
                    Claim #{claim.reference} · Item: {claim.productNameSnapshot}
                  </p>
                  <p className="mt-1 text-[11px] text-ink2">
                    {claim.variantNameSnapshot} · SKU: {claim.skuSnapshot} · Order:{" "}
                    <span className="font-semibold text-ink">
                      {claim.orderReferenceSnapshot}
                    </span>
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] ${warrantyStatusClass(claim.status)}`}
                >
                  {formatWarrantyStatus(claim.status)}
                </span>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-[12px] leading-5 text-ink2">
                {claim.issueDescription}
              </p>
              {claim.rejectionReason && (
                <p className="mt-3 rounded-card bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
                  Rejection reason: {claim.rejectionReason}
                </p>
              )}
              <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex flex-wrap gap-3">
                  {claim.evidence.map((evidence, index) => (
                    <a
                      key={evidence.id}
                      href={evidence.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="h-24 w-24 overflow-hidden rounded-card bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      <img
                        src={evidence.imageUrl}
                        alt={`${claim.productNameSnapshot} evidence ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </a>
                  ))}
                </div>
                <ol className="divide-y divide-line border-y border-line">
                  {claim.history.map((entry) => (
                    <li key={entry.id} className="py-3 text-[11px]">
                      <div className="flex justify-between gap-3">
                        <p className="font-medium text-ink">
                          {formatWarrantyStatus(entry.newStatus)}
                        </p>
                        <p className="text-[10px] text-ink2">
                          {new Date(entry.createdAt).toLocaleString("en-BD")}
                        </p>
                      </div>
                      {entry.note && (
                        <p className="mt-1 leading-4 text-ink2">{entry.note}</p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </article>
          ))}
          {loading && claims.length === 0 && (
            <p className="py-12 text-center text-[13px] text-ink2">
              Loading warranty claims…
            </p>
          )}
          {!loading && !loadError && claims.length === 0 && (
            <p className="py-12 text-center text-[13px] text-ink2">
              You have not submitted any item warranty claims yet.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

export default function WarrantyPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-5xl px-6 py-20 text-[13px] text-ink2">
          Loading warranty claim portal…
        </main>
      }
    >
      <WarrantyContent />
    </Suspense>
  );
}
