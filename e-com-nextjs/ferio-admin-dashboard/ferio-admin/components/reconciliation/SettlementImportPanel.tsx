"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { formatTaka } from "@/lib/catalog";
import type {
  CourierSettlementImport,
  SettlementReportPreflight,
  SettlementReportTemplate,
} from "@/lib/settlements";

type ImportRowDraft = {
  id: string;
  providerRowReference: string;
  trackingNumber: string;
  collectedAmount: string;
  courierFee: string;
  otherDeduction: string;
  note: string;
};

function emptyRow(): ImportRowDraft {
  return {
    id: crypto.randomUUID(),
    providerRowReference: "",
    trackingNumber: "",
    collectedAmount: "",
    courierFee: "",
    otherDeduction: "0.00",
    note: "",
  };
}

function minorUnits(value: string) {
  return Math.round(Number(value) * 100);
}

function statusClass(status: string) {
  if (status === "APPLIED") return "bg-emerald-50 text-emerald-700";
  if (status === "NEEDS_REVIEW") return "bg-amber-50 text-amber-700";
  if (status === "SUPERSEDED") return "bg-surface text-ink2";
  return "bg-rose-50 text-rose-700";
}

function importStatusLabel(status: CourierSettlementImport["status"]) {
  if (status === "APPLIED") return "applied";
  if (status === "SUPERSEDED") return "superseded";
  return "needs review";
}

export default function SettlementImportPanel({
  onApplied,
}: {
  onApplied: () => Promise<void>;
}) {
  const [imports, setImports] = useState<CourierSettlementImport[]>([]);
  const [rows, setRows] = useState<ImportRowDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [correctionTarget, setCorrectionTarget] =
    useState<CourierSettlementImport | null>(null);
  const [formProvider, setFormProvider] = useState<"PATHAO" | "STEADFAST">(
    "STEADFAST",
  );
  const [formSource, setFormSource] = useState<"API" | "CSV" | "MANUAL_JSON">(
    "CSV",
  );
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [preflighting, setPreflighting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [preflight, setPreflight] = useState<SettlementReportPreflight | null>(
    null,
  );

  useEffect(() => {
    setRows([emptyRow()]);
  }, []);

  const loadImports = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/settlements/imports", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: CourierSettlementImport[];
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(
          payload.message || "Unable to load settlement imports.",
        );
      }
      setImports(payload.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load settlement imports.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadImports();
  }, [loadImports]);

  function updateRow(id: string, field: keyof ImportRowDraft, value: string) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (
        formSource === "CSV" &&
        (!preflight?.ready || !csvFile || csvContent === null)
      ) {
        throw new Error("Preview the current CSV successfully before import.");
      }
      const response = await fetch("/api/settlements/imports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          provider: form.get("provider"),
          source: form.get("source"),
          providerReportReference: form.get("providerReportReference"),
          bankReference: form.get("bankReference"),
          remittedAmount: minorUnits(String(form.get("remittedAmount"))),
          settledAt: new Date(String(form.get("settledAt"))).toISOString(),
          note: String(form.get("note") || "") || undefined,
          supersedesImportId: correctionTarget?.id,
          csvEvidence:
            formSource === "CSV" && preflight && csvFile && csvContent !== null
              ? {
                  fileName: csvFile.name,
                  sourceChecksum: preflight.sourceChecksum,
                  content: csvContent,
                }
              : undefined,
          rows: rows.map((row) => ({
            providerRowReference: row.providerRowReference,
            trackingNumber: row.trackingNumber,
            collectedAmount: minorUnits(row.collectedAmount),
            courierFee: minorUnits(row.courierFee),
            otherDeduction: minorUnits(row.otherDeduction),
            note: row.note || undefined,
          })),
        }),
      });
      const payload = (await response.json()) as {
        data?: CourierSettlementImport;
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(
          payload.message || "Unable to import settlement report.",
        );
      }
      setNotice(
        payload.data.status === "APPLIED"
          ? "Report applied. COD collection and settlement evidence are updated."
          : "Report retained for review. No partial settlement was posted.",
      );
      setRows([emptyRow()]);
      setCorrectionTarget(null);
      setFormProvider("STEADFAST");
      setFormSource("CSV");
      setCsvFile(null);
      setCsvContent(null);
      setPreflight(null);
      formElement.reset();
      await Promise.all([loadImports(), onApplied()]);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to import settlement report.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function previewCsv() {
    if (!csvFile) return setError("Choose a CSV report first.");
    setPreflighting(true);
    setError("");
    setNotice("");
    try {
      const content = await csvFile.text();
      const response = await fetch("/api/settlements/imports/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: formProvider,
          fileName: csvFile.name,
          content,
        }),
      });
      const payload = (await response.json()) as {
        data?: SettlementReportPreflight;
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(
          payload.message || "Unable to validate settlement CSV.",
        );
      }
      setPreflight(payload.data);
      setCsvContent(content);
      if (payload.data.ready) {
        setRows(
          payload.data.rows.map((row) => ({
            id: crypto.randomUUID(),
            providerRowReference: row.providerRowReference,
            trackingNumber: row.trackingNumber,
            collectedAmount: (row.collectedAmount / 100).toFixed(2),
            courierFee: (row.courierFee / 100).toFixed(2),
            otherDeduction: (row.otherDeduction / 100).toFixed(2),
            note: row.note ?? "",
          })),
        );
        setNotice(
          `CSV ready: ${payload.data.acceptedRowCount} rows · checksum ${payload.data.sourceChecksum.slice(0, 12)}…`,
        );
      }
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "Unable to validate settlement CSV.",
      );
    } finally {
      setPreflighting(false);
    }
  }

  async function downloadTemplate() {
    setDownloadingTemplate(true);
    setError("");
    try {
      const response = await fetch("/api/settlements/imports/template", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: SettlementReportTemplate;
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(
          payload.message || "Unable to download settlement template.",
        );
      }
      const url = URL.createObjectURL(
        new Blob([payload.data.content], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = payload.data.fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to download settlement template.",
      );
    } finally {
      setDownloadingTemplate(false);
    }
  }

  function beginCorrection(entry: CourierSettlementImport) {
    setCorrectionTarget(entry);
    setFormProvider(entry.provider.code);
    setFormSource(entry.source);
    setCsvFile(null);
    setCsvContent(null);
    setPreflight(null);
    setRows(
      entry.rows.map((row) => ({
        id: crypto.randomUUID(),
        providerRowReference: row.providerRowReference,
        trackingNumber: row.trackingNumber,
        collectedAmount: (row.collectedAmount / 100).toFixed(2),
        courierFee: (row.courierFee / 100).toFixed(2),
        otherDeduction: (row.otherDeduction / 100).toFixed(2),
        note: "",
      })),
    );
    setError("");
    setNotice(
      `Correcting ${entry.reference}. Update the source rows before importing.`,
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-medium text-ink">
            Import courier report
          </h2>
          <p className="mt-1 max-w-3xl text-[12px] leading-5 text-ink2">
            Enter normalized rows from a Pathao or Steadfast report. Every row
            must match before financial records change; mixed reports are kept
            intact for review.
          </p>
        </div>
        <span className="text-[11px] uppercase tracking-eyebrow text-ink2">
          {imports.filter((entry) => entry.status === "NEEDS_REVIEW").length}{" "}
          need review
        </span>
      </div>

      <form
        key={correctionTarget?.id ?? "new-report"}
        onSubmit={submit}
        className="mt-5"
      >
        {correctionTarget && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-y border-line bg-surface px-4 py-3">
            <p className="text-[12px] text-ink">
              Correcting {correctionTarget.reference} · provider report{" "}
              {correctionTarget.providerReportReference}
            </p>
            <button
              type="button"
              onClick={() => {
                setCorrectionTarget(null);
                setFormProvider("STEADFAST");
                setFormSource("CSV");
                setCsvFile(null);
                setCsvContent(null);
                setPreflight(null);
                setCsvContent(null);
                setRows([emptyRow()]);
                setNotice("");
              }}
              className="text-[11px] text-ink2"
            >
              Cancel correction
            </button>
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-[10px] text-ink2">
            Provider
            <select
              required
              name={correctionTarget ? undefined : "provider"}
              value={formProvider}
              disabled={Boolean(correctionTarget)}
              onChange={(event) => {
                setFormProvider(event.target.value as typeof formProvider);
                setCsvContent(null);
                setPreflight(null);
              }}
              className="mt-1 w-full rounded-card border border-line px-3 py-2.5 text-[12px] text-ink"
            >
              <option value="STEADFAST">Steadfast</option>
              <option value="PATHAO">Pathao</option>
            </select>
            {correctionTarget && (
              <input type="hidden" name="provider" value={formProvider} />
            )}
          </label>
          <label className="text-[10px] text-ink2">
            Source evidence
            <select
              required
              name="source"
              value={formSource}
              onChange={(event) => {
                setFormSource(event.target.value as typeof formSource);
                setCsvFile(null);
                setCsvContent(null);
                setPreflight(null);
              }}
              className="mt-1 w-full rounded-card border border-line px-3 py-2.5 text-[12px] text-ink"
            >
              <option value="CSV">CSV report</option>
              <option value="API">Provider API</option>
              <option value="MANUAL_JSON">Manual normalized data</option>
            </select>
          </label>
          <label className="text-[10px] text-ink2">
            Provider report reference
            <input
              required
              name="providerReportReference"
              minLength={2}
              maxLength={200}
              className="mt-1 w-full rounded-card border border-line px-3 py-2.5 text-[12px] text-ink"
            />
          </label>
          <label className="text-[10px] text-ink2">
            Bank reference
            <input
              required
              name="bankReference"
              minLength={2}
              maxLength={200}
              className="mt-1 w-full rounded-card border border-line px-3 py-2.5 text-[12px] text-ink"
            />
          </label>
          <label className="text-[10px] text-ink2">
            Remitted amount
            <input
              required
              name="remittedAmount"
              type="number"
              min="0"
              step="0.01"
              className="mt-1 w-full rounded-card border border-line px-3 py-2.5 text-[12px] text-ink"
            />
          </label>
          <label className="text-[10px] text-ink2">
            Settled at
            <input
              required
              name="settledAt"
              type="datetime-local"
              className="mt-1 w-full rounded-card border border-line px-3 py-2.5 text-[12px] text-ink"
            />
          </label>
          <label className="text-[10px] text-ink2 md:col-span-2">
            Batch note
            <input
              name="note"
              maxLength={1000}
              placeholder="Optional context retained with the import"
              className="mt-1 w-full rounded-card border border-line px-3 py-2.5 text-[12px] text-ink"
            />
          </label>
        </div>

        {formSource === "CSV" && (
          <div className="mt-5 border-y border-line bg-surface px-4 py-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-64 flex-1 text-[10px] text-ink2">
                Canonical CSV file
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    setCsvFile(event.target.files?.[0] ?? null);
                    setCsvContent(null);
                    setPreflight(null);
                  }}
                  className="mt-1 block w-full rounded-card border border-line bg-paper px-3 py-2 text-[11px] text-ink"
                />
              </label>
              <button
                type="button"
                disabled={downloadingTemplate}
                onClick={() => void downloadTemplate()}
                className="rounded-full border border-line bg-paper px-4 py-2.5 text-[12px] text-ink disabled:opacity-40"
              >
                {downloadingTemplate ? "Preparing…" : "Download template"}
              </button>
              <button
                type="button"
                disabled={!csvFile || preflighting}
                onClick={() => void previewCsv()}
                className="rounded-full border border-line bg-paper px-4 py-2.5 text-[12px] text-ink disabled:opacity-40"
              >
                {preflighting ? "Checking…" : "Preview CSV"}
              </button>
            </div>
            <p className="mt-3 text-[10px] leading-4 text-ink2">
              Required headers: provider_row_reference, tracking_number,
              collected_amount, courier_fee, other_deduction. Optional: note.
              Enter money as BDT decimals, for example 1500.50. Maximum 1 MB and
              500 rows.
            </p>
            {preflight && (
              <div className="mt-3 border-t border-line pt-3 text-[11px]">
                <p className="text-ink2">
                  {preflight.rowCount} rows · {preflight.acceptedRowCount}{" "}
                  accepted · {preflight.rejectedLineCount} rejected
                </p>
                {preflight.errors.length > 0 && (
                  <ul className="mt-2 space-y-1 text-rose-700">
                    {preflight.errors.map((entry) => (
                      <li key={entry}>{entry}</li>
                    ))}
                  </ul>
                )}
                {preflight.warnings.length > 0 && (
                  <ul className="mt-2 space-y-1 text-amber-700">
                    {preflight.warnings.map((entry) => (
                      <li key={entry}>{entry}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-5 overflow-x-auto border-y border-line">
          <table className="w-full min-w-[1080px] text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-eyebrow text-ink2">
                <th className="px-3 py-3 font-normal">Provider row</th>
                <th className="px-3 py-3 font-normal">Tracking</th>
                <th className="px-3 py-3 font-normal">Collected</th>
                <th className="px-3 py-3 font-normal">Courier fee</th>
                <th className="px-3 py-3 font-normal">Other deduction</th>
                <th className="px-3 py-3 font-normal">Note</th>
                <th className="px-3 py-3 font-normal">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id}>
                  {(
                    [
                      ["providerRowReference", "Provider row reference"],
                      ["trackingNumber", "Tracking number"],
                      ["collectedAmount", "0.00"],
                      ["courierFee", "0.00"],
                      ["otherDeduction", "0.00"],
                      ["note", "Optional note"],
                    ] as const
                  ).map(([field, placeholder]) => (
                    <td key={field} className="px-3 py-3">
                      <input
                        required={field !== "note"}
                        type={
                          [
                            "collectedAmount",
                            "courierFee",
                            "otherDeduction",
                          ].includes(field)
                            ? "number"
                            : "text"
                        }
                        min={field === "note" ? undefined : "0"}
                        step={field === "note" ? undefined : "0.01"}
                        maxLength={field === "note" ? 500 : 200}
                        value={row[field]}
                        readOnly={formSource === "CSV" && preflight?.ready}
                        placeholder={placeholder}
                        onChange={(event) =>
                          updateRow(row.id, field, event.target.value)
                        }
                        className="w-full min-w-32 rounded-card border border-line px-2.5 py-2 text-[11px] text-ink"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      disabled={
                        rows.length === 1 ||
                        (formSource === "CSV" && preflight?.ready)
                      }
                      onClick={() =>
                        setRows((current) =>
                          current.filter((entry) => entry.id !== row.id),
                        )
                      }
                      className="text-[11px] text-ink2 disabled:opacity-30"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={formSource === "CSV" && preflight?.ready}
            onClick={() => setRows((current) => [...current, emptyRow()])}
            className="rounded-full border border-line px-4 py-2.5 text-[12px] text-ink"
          >
            Add row
          </button>
          <button
            disabled={
              saving ||
              rows.length === 0 ||
              (formSource === "CSV" && !preflight?.ready)
            }
            className="rounded-full bg-ink px-5 py-2.5 text-[12px] text-white disabled:opacity-40"
          >
            {saving ? "Importing…" : `Import report (${rows.length})`}
          </button>
          <p className="text-[11px] text-ink2">
            Source rows become immutable after import.
          </p>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-[12px] text-rose-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-3 text-[12px] text-emerald-700">
            {notice}
          </p>
        )}
      </form>

      <div className="mt-10">
        <h3 className="text-[15px] font-medium text-ink">Import history</h3>
        <p className="mt-1 text-[12px] text-ink2">
          Review exceptions here. Correct source data by importing a new report;
          recorded evidence cannot be edited.
        </p>
        <div className="mt-4 divide-y divide-line border-y border-line">
          {imports.map((entry) => (
            <article key={entry.id} className="py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-medium text-ink">
                    {entry.reference} · {entry.provider.name}
                  </p>
                  <p className="mt-1 text-[11px] text-ink2">
                    Provider {entry.providerReportReference} · {entry.source} ·{" "}
                    {entry.rowCount} rows · {entry.appliedCount} matched
                  </p>
                  {entry.sourceFileChecksum && (
                    <p className="mt-1 text-[10px] text-ink2">
                      File {entry.sourceFileName} · {entry.parserVersion} ·{" "}
                      checksum {entry.sourceFileChecksum.slice(0, 12)}…
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] ${statusClass(entry.status)}`}
                  >
                    {importStatusLabel(entry.status)}
                  </span>
                  <p className="mt-2 text-[10px] text-ink2">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              {entry.settlement && (
                <p className="mt-3 text-[11px] text-ink2">
                  Settlement {entry.settlement.reference} · remitted{" "}
                  {formatTaka(entry.settlement.remittedAmount)}
                </p>
              )}
              {entry.supersedesImport && (
                <p className="mt-2 text-[11px] text-ink2">
                  Corrects {entry.supersedesImport.reference} · provider report{" "}
                  {entry.supersedesImport.providerReportReference}
                </p>
              )}
              {entry.supersededBy && (
                <p className="mt-2 text-[11px] text-ink2">
                  Superseded by {entry.supersededBy.reference} · provider report{" "}
                  {entry.supersededBy.providerReportReference}
                </p>
              )}
              {entry.status === "NEEDS_REVIEW" && (
                <button
                  type="button"
                  onClick={() => beginCorrection(entry)}
                  className="mt-3 rounded-full border border-line px-4 py-2 text-[11px] text-ink"
                >
                  Correct report
                </button>
              )}
              {entry.exceptionCount > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-eyebrow text-ink2">
                        <th className="py-2 pr-4 font-normal">Row</th>
                        <th className="py-2 pr-4 font-normal">Tracking</th>
                        <th className="py-2 pr-4 font-normal">Status</th>
                        <th className="py-2 font-normal">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {entry.rows
                        .filter((row) => row.status !== "APPLIED")
                        .map((row) => (
                          <tr key={row.id} className="text-[11px]">
                            <td className="py-2.5 pr-4 text-ink">
                              {row.providerRowReference}
                            </td>
                            <td className="py-2.5 pr-4 text-ink2">
                              {row.trackingNumber}
                            </td>
                            <td className="py-2.5 pr-4">
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] ${statusClass(row.status)}`}
                              >
                                {row.status.toLowerCase().replaceAll("_", " ")}
                              </span>
                            </td>
                            <td className="py-2.5 text-ink2">
                              {row.reason || "Review required"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          ))}
          {loading && (
            <p className="py-10 text-center text-[12px] text-ink2">
              Loading imports…
            </p>
          )}
          {!loading && imports.length === 0 && (
            <p className="py-10 text-center text-[12px] text-ink2">
              No settlement reports imported.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
