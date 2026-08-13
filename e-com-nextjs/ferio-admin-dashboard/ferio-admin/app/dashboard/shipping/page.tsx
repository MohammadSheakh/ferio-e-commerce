"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import RtoQueue from "@/components/shipping/RtoQueue";
import { formatTaka } from "@/lib/catalog";
import type {
  CourierWebhookLog,
  CourierWebhookQueueHealth,
  Shipment,
  ShipmentPollAttempt,
  ShipmentPollingQueueHealth,
  ShipmentProvider,
} from "@/lib/shipping";
import { shipmentStatusClass, webhookStatus } from "@/lib/shipping";

export default function ShippingPage() {
  const [providers, setProviders] = useState<ShipmentProvider[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<CourierWebhookLog[]>([]);
  const [webhookQueue, setWebhookQueue] =
    useState<CourierWebhookQueueHealth | null>(null);
  const [pollAttempts, setPollAttempts] = useState<ShipmentPollAttempt[]>([]);
  const [pollingQueue, setPollingQueue] =
    useState<ShipmentPollingQueueHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [
        providerResponse,
        shipmentResponse,
        webhookResponse,
        webhookQueueResponse,
        pollAttemptsResponse,
        pollingQueueResponse,
      ] =
        await Promise.all([
          fetch("/api/shipping/providers", { cache: "no-store" }),
          fetch("/api/shipping/shipments", { cache: "no-store" }),
          fetch("/api/shipping/webhooks", { cache: "no-store" }),
          fetch("/api/shipping/webhooks/queue-health", { cache: "no-store" }),
          fetch("/api/shipping/polls", { cache: "no-store" }),
          fetch("/api/shipping/polls/queue-health", { cache: "no-store" }),
        ]);
      const providerPayload = (await providerResponse.json()) as {
        data?: ShipmentProvider[];
        message?: string;
      };
      const shipmentPayload = (await shipmentResponse.json()) as {
        data?: Shipment[];
        message?: string;
      };
      const webhookPayload = (await webhookResponse.json()) as {
        data?: CourierWebhookLog[];
        message?: string;
      };
      const webhookQueuePayload = (await webhookQueueResponse.json()) as {
        data?: CourierWebhookQueueHealth;
        message?: string;
      };
      const pollAttemptsPayload = (await pollAttemptsResponse.json()) as {
        data?: ShipmentPollAttempt[];
        message?: string;
      };
      const pollingQueuePayload = (await pollingQueueResponse.json()) as {
        data?: ShipmentPollingQueueHealth;
        message?: string;
      };
      if (!providerResponse.ok || !providerPayload.data) {
        throw new Error(providerPayload.message || "Unable to load providers.");
      }
      if (!shipmentResponse.ok || !shipmentPayload.data) {
        throw new Error(shipmentPayload.message || "Unable to load shipments.");
      }
      if (!webhookResponse.ok || !webhookPayload.data) {
        throw new Error(
          webhookPayload.message || "Unable to load courier callbacks.",
        );
      }
      if (!webhookQueueResponse.ok || !webhookQueuePayload.data) {
        throw new Error(
          webhookQueuePayload.message || "Unable to load callback retries.",
        );
      }
      if (!pollAttemptsResponse.ok || !pollAttemptsPayload.data) {
        throw new Error(
          pollAttemptsPayload.message || "Unable to load courier polls.",
        );
      }
      if (!pollingQueueResponse.ok || !pollingQueuePayload.data) {
        throw new Error(
          pollingQueuePayload.message || "Unable to load polling health.",
        );
      }
      setProviders(providerPayload.data);
      setShipments(shipmentPayload.data);
      setWebhookLogs(webhookPayload.data);
      setWebhookQueue(webhookQueuePayload.data);
      setPollAttempts(pollAttemptsPayload.data);
      setPollingQueue(pollingQueuePayload.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load shipping.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleProvider(provider: ShipmentProvider) {
    setError("");
    try {
      const response = await fetch(`/api/shipping/providers/${provider.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !provider.isActive }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(payload.message || "Unable to update provider.");
      await load();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update provider.",
      );
    }
  }

  async function retryWebhook(log: CourierWebhookLog) {
    setError("");
    try {
      const response = await fetch(`/api/shipping/webhooks/${log.id}/retry`, {
        method: "POST",
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to queue callback retry.");
      }
      await load();
    } catch (retryError) {
      setError(
        retryError instanceof Error
          ? retryError.message
          : "Unable to queue callback retry.",
      );
    }
  }

  async function pollShipment(shipment: Shipment) {
    setError("");
    try {
      const response = await fetch(
        `/api/shipping/shipments/${shipment.id}/poll`,
        { method: "POST" },
      );
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to queue shipment poll.");
      }
      await load();
    } catch (pollError) {
      setError(
        pollError instanceof Error
          ? pollError.message
          : "Unable to queue shipment poll.",
      );
    }
  }

  return (
    <>
      <Topbar
        title="Shipping"
        subtitle={`${shipments.length} shipment records`}
      />
      <div className="space-y-9 p-8">
        <section>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[16px] font-medium text-ink">
                Courier providers
              </h2>
              <p className="mt-1 text-[12px] text-ink2">
                Credentials stay in environment secrets. Activation is blocked
                until configuration is complete.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {providers.map((provider) => (
              <div
                key={provider.code}
                className="rounded-card border border-line p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[14px] font-medium text-ink">
                      {provider.name}
                    </p>
                    <p className="mt-1 text-[11px] text-ink2">
                      {provider.code} ·{" "}
                      {provider.configured
                        ? "Credentials configured"
                        : "Credentials missing"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] ${provider.isActive ? "bg-emerald-50 text-emerald-700" : provider.configured ? "bg-surface text-ink2" : "bg-amber-50 text-amber-700"}`}
                  >
                    {provider.isActive
                      ? "Active"
                      : provider.configured
                        ? "Inactive"
                        : "Not ready"}
                  </span>
                </div>
                <button
                  disabled={!provider.configured}
                  onClick={() => void toggleProvider(provider)}
                  className="mt-5 rounded-full border border-line px-4 py-2 text-[12px] text-ink disabled:opacity-40"
                >
                  {provider.isActive ? "Disable" : "Enable"}
                </button>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <p role="alert" className="text-[13px] text-rose-700">
            {error}
          </p>
        )}
        <section>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[16px] font-medium text-ink">
                Callback evidence
              </h2>
              <p className="mt-1 text-[12px] text-ink2">
                Latest authenticated, rejected, retried, and processed courier
                callbacks. Credential headers are redacted before storage.
              </p>
            </div>
            {webhookQueue && (
              <div className="text-right text-[11px] text-ink2">
                <p>
                  {webhookQueue.available ? "Retry queue available" : "Retry queue unavailable"}
                  {` · ${webhookQueue.recoverableCount} recoverable`}
                </p>
                <p className="mt-1">
                  {webhookQueue.scheduleEnabled
                    ? `Sweep every ${webhookQueue.scheduleEveryMinutes} minutes`
                    : "Automatic sweep disabled"}
                </p>
              </div>
            )}
          </div>
          <div className="mt-5 overflow-x-auto rounded-card border border-line">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-eyebrow text-ink2">
                  <th className="px-5 py-3 font-normal">Received</th>
                  <th className="px-5 py-3 font-normal">Courier</th>
                  <th className="px-5 py-3 font-normal">Status</th>
                  <th className="px-5 py-3 font-normal">Attempts</th>
                  <th className="px-5 py-3 font-normal">Last attempt</th>
                  <th className="px-5 py-3 font-normal">Evidence</th>
                  <th className="px-5 py-3 font-normal">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {webhookLogs.map((log) => {
                  const status = webhookStatus(log);
                  return (
                    <tr key={log.id} className="text-[13px]">
                      <td className="px-5 py-3.5 text-ink2">
                        {new Date(log.receivedAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-ink">
                        {log.providerCode}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-ink">
                        {log.attemptCount}
                      </td>
                      <td className="px-5 py-3.5 text-ink2">
                        {log.lastAttemptAt
                          ? new Date(log.lastAttemptAt).toLocaleString()
                          : "Not started"}
                      </td>
                      <td className="max-w-[360px] px-5 py-3.5 text-ink2">
                        {log.processingError ||
                          (log.processedAt
                            ? `Completed ${new Date(log.processedAt).toLocaleString()}`
                            : "Awaiting processing")}
                      </td>
                      <td className="px-5 py-3.5">
                        {webhookQueue?.available &&
                        log.authValid &&
                        !log.processed &&
                        !log.processingStartedAt &&
                        log.attemptCount < webhookQueue.maxAttempts ? (
                          <button
                            onClick={() => void retryWebhook(log)}
                            className="rounded-full border border-line px-3 py-1.5 text-[11px] text-ink"
                          >
                            Queue retry
                          </button>
                        ) : (
                          <span className="text-[11px] text-ink2">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!loading && webhookLogs.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-14 text-center text-[13px] text-ink2"
                    >
                      No courier callbacks have been received.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-14 text-center text-[13px] text-ink2"
                    >
                      Loading callback evidence…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[16px] font-medium text-ink">
                Shipment queue
              </h2>
              <p className="mt-1 text-[12px] text-ink2">
                Polling remains unavailable until a provider status contract is
                configured.
              </p>
            </div>
            {pollingQueue && (
              <div className="text-right text-[11px] text-ink2">
                <p>
                  {pollingQueue.available
                    ? "Polling queue available"
                    : "Polling queue unavailable"}
                  {` · ${pollingQueue.eligibleCount} eligible`}
                </p>
                <p className="mt-1">
                  {pollingQueue.scheduleEnabled
                    ? `Poll every ${pollingQueue.scheduleEveryMinutes} minutes`
                    : "Automatic polling disabled"}
                </p>
              </div>
            )}
          </div>
          <div className="mt-5 overflow-x-auto rounded-card border border-line">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-eyebrow text-ink2">
                  <th className="px-5 py-3 font-normal">Order</th>
                  <th className="px-5 py-3 font-normal">Customer</th>
                  <th className="px-5 py-3 font-normal">Courier</th>
                  <th className="px-5 py-3 font-normal">Tracking</th>
                  <th className="px-5 py-3 font-normal">COD</th>
                  <th className="px-5 py-3 font-normal">Status</th>
                  <th className="px-5 py-3 font-normal">Polling</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shipments.map((shipment) => (
                  <tr key={shipment.id} className="text-[13px]">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/dashboard/orders/${shipment.order?.id}`}
                        className="font-medium text-ink hover:underline"
                      >
                        {shipment.order?.reference}
                      </Link>
                      <p className="text-[11px] text-ink2">
                        {shipment.order?.address
                          ? `${shipment.order.address.area}, ${shipment.order.address.district}`
                          : "—"}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      {shipment.provider.pollingConfigured &&
                      !["DELIVERED", "RETURNED", "CANCELLED", "RTO"].includes(
                        shipment.status,
                      ) ? (
                        <button
                          onClick={() => void pollShipment(shipment)}
                          className="rounded-full border border-line px-3 py-1.5 text-[11px] text-ink"
                        >
                          Poll now
                        </button>
                      ) : (
                        <span className="text-[11px] text-ink2">
                          {shipment.pollingError || "Not configured"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-ink">
                        {shipment.order?.customer.name}
                      </p>
                      <p className="text-[11px] text-ink2">
                        {shipment.order?.customer.phoneNormalized}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-ink2">
                      {shipment.provider.name}
                    </td>
                    <td className="px-5 py-3.5 text-ink2">
                      {shipment.trackingNumber || "Pending"}
                    </td>
                    <td className="px-5 py-3.5 text-ink">
                      {formatTaka(shipment.codAmount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] ${shipmentStatusClass(shipment.status)}`}
                      >
                        {shipment.status.replaceAll("_", " ").toLowerCase()}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && shipments.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-14 text-center text-[13px] text-ink2"
                    >
                      No courier shipments have been created.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-14 text-center text-[13px] text-ink2"
                    >
                      Loading shipments…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h2 className="text-[16px] font-medium text-ink">Poll evidence</h2>
          <div className="mt-5 overflow-x-auto rounded-card border border-line">
            <table className="w-full min-w-[780px] text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-eyebrow text-ink2">
                  <th className="px-5 py-3 font-normal">Created</th>
                  <th className="px-5 py-3 font-normal">Order</th>
                  <th className="px-5 py-3 font-normal">Courier</th>
                  <th className="px-5 py-3 font-normal">Result</th>
                  <th className="px-5 py-3 font-normal">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pollAttempts.map((attempt) => (
                  <tr key={attempt.id} className="text-[13px]">
                    <td className="px-5 py-3.5 text-ink2">
                      {new Date(attempt.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-ink">
                      {attempt.shipment.order.reference}
                    </td>
                    <td className="px-5 py-3.5 text-ink2">
                      {attempt.shipment.provider.name}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] ${attempt.status === "SUCCEEDED" ? "bg-emerald-50 text-emerald-700" : attempt.status === "FAILED" ? "bg-rose-50 text-rose-700" : "bg-surface text-ink2"}`}
                      >
                        {attempt.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-ink2">
                      {attempt.errorMessage ||
                        attempt.normalizedStatus?.replaceAll("_", " ").toLowerCase() ||
                        "Awaiting provider result"}
                    </td>
                  </tr>
                ))}
                {!loading && pollAttempts.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-14 text-center text-[13px] text-ink2"
                    >
                      No courier polls have been recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <RtoQueue />
      </div>
    </>
  );
}
