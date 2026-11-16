"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readJsonRecord, responseMessage } from "@/lib/client-response";

interface TenantStorageCardProps {
  organizationId: string;
  database: {
    id: string;
    databaseName: string;
    status: string;
    schemaVersion?: string;
    lastHealthy?: boolean | null;
    diskSizeBytes?: string | null;
    diskSizeRecordedAt?: string | null;
  } | null;
}

function formatBytes(bytesStr?: string | null): string {
  if (!bytesStr) return "—";
  const bytes = Number(bytesStr);
  if (Number.isNaN(bytes) || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function TenantStorageCard({
  organizationId,
  database,
}: TenantStorageCardProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  // Optimistic/local state after manual measurement
  const [measuredSize, setMeasuredSize] = useState<string | null>(
    database?.diskSizeBytes ?? null,
  );
  const [recordedAt, setRecordedAt] = useState<string | null>(
    database?.diskSizeRecordedAt ?? null,
  );

  if (!database) {
    return (
      <div className="card">
        <p className="eyebrow">Tenant Database</p>
        <p className="muted">Not provisioned yet — run provisioning.</p>
      </div>
    );
  }

  async function handleConfirmMeasure() {
    setWorking(true);
    setMessage("");
    setIsError(false);

    try {
      const res = await fetch(
        `/api/platform/organizations/${organizationId}/database-storage/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        },
      );
      const data = await readJsonRecord(res);
      setWorking(false);

      if (res.ok) {
        setShowModal(false);
        const payload = data.data as
          | { sizeBytes?: string; formattedSize?: string; recordedAt?: string }
          | undefined;

        if (payload?.sizeBytes) {
          setMeasuredSize(payload.sizeBytes);
        }
        if (payload?.recordedAt) {
          setRecordedAt(payload.recordedAt);
        }
        setMessage(`Measured successfully: ${payload?.formattedSize ?? "Updated"}.`);
        router.refresh();
      } else {
        setIsError(true);
        setMessage(responseMessage(data, "Storage measurement failed."));
      }
    } catch {
      setWorking(false);
      setIsError(true);
      setMessage("Control plane unavailable for measurement.");
    }
  }

  return (
    <>
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <p className="eyebrow">Tenant Database & Storage</p>
            <p style={{ margin: "4px 0 8px", fontSize: 15, fontWeight: 500 }}>
              {database.databaseName} ·{" "}
              <span className="statuspill">{database.status}</span>
              {database.schemaVersion ? (
                <span className="muted" style={{ fontWeight: 400 }}>
                  {" "}
                  · schema {database.schemaVersion}
                </span>
              ) : null}
              {database.lastHealthy === false ? (
                <span style={{ color: "#b91c1c" }}>
                  {" "}
                  · ⚠ last health check failed
                </span>
              ) : null}
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowModal(true)}
            style={{ alignSelf: "flex-start" }}
          >
            Measure Disk Storage
          </button>
        </div>

        <div style={{ height: 12 }} />

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            padding: "12px 14px",
            background: "var(--surface)",
            borderRadius: 8,
            border: "1px solid var(--line)",
          }}
        >
          <div>
            <span
              style={{
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink2)",
              }}
            >
              Physical Database Size
            </span>
            <div style={{ fontSize: 20, fontWeight: 600, marginTop: 2 }}>
              {measuredSize ? formatBytes(measuredSize) : "Not measured yet"}
            </div>
          </div>

          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <span
              style={{
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink2)",
              }}
            >
              Last Measurement
            </span>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
              {recordedAt
                ? new Date(recordedAt).toLocaleString()
                : "Manual trigger only (zero background I/O)"}
            </div>
          </div>
        </div>

        {message && (
          <p
            className={isError ? "error-message" : "save-message"}
            style={{ marginTop: 10, marginBottom: 0 }}
          >
            {message}
          </p>
        )}
      </div>

      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(17, 17, 20, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--paper)",
              borderRadius: 12,
              border: "1px solid var(--line)",
              maxWidth: 480,
              width: "100%",
              padding: 24,
              boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            }}
          >
            <p className="eyebrow">Confirm Storage Inspection</p>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                margin: "6px 0 12px",
                letterSpacing: "-0.01em",
              }}
            >
              Measure database disk size?
            </h2>

            <p
              className="muted"
              style={{ lineHeight: 1.5, margin: "0 0 14px", fontSize: 13 }}
            >
              This triggers <code>pg_database_size</code> against PostgreSQL for
              database <strong>{database.databaseName}</strong> to read actual
              relation files on disk.
            </p>

            <div
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: "12px 14px",
                marginBottom: 20,
                fontSize: 12,
                color: "#991b1b",
                lineHeight: 1.45,
                fontWeight: 500,
              }}
            >
              <strong>Warning:</strong> To protect host SSD endurance and
              prevent disk I/O contention with active customer traffic,
              background scans are disabled. Only run this when disk measurement
              is explicitly needed.
            </div>

            {message && isError && (
              <p className="error-message" style={{ margin: "0 0 14px" }}>
                {message}
              </p>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                type="button"
                className="secondary-button"
                disabled={working}
                onClick={() => {
                  setShowModal(false);
                  setMessage("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pill"
                disabled={working}
                onClick={handleConfirmMeasure}
              >
                {working ? "Measuring…" : "Confirm & Measure"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

