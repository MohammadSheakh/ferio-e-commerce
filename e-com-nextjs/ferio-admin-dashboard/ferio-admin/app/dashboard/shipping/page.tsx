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

function formatEnum(value: string) {
  const label = value.replaceAll("_", " ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

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
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
      ] = await Promise.all([
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
      const failures: string[] = [];
      if (providerResponse.ok && providerPayload.data) {
        setProviders(providerPayload.data);
      } else {
        failures.push(
          providerPayload.message || "Unable to load courier providers.",
        );
      }
      if (shipmentResponse.ok && shipmentPayload.data) {
        setShipments(shipmentPayload.data);
      } else {
        failures.push(shipmentPayload.message || "Unable to load shipments.");
      }
      if (webhookResponse.ok && webhookPayload.data) {
        setWebhookLogs(webhookPayload.data);
      } else {
        failures.push(
          webhookPayload.message || "Unable to load courier callbacks.",
        );
      }
      if (webhookQueueResponse.ok && webhookQueuePayload.data) {
        setWebhookQueue(webhookQueuePayload.data);
      } else {
        failures.push(
          webhookQueuePayload.message || "Unable to load callback retries.",
        );
      }
      if (pollAttemptsResponse.ok && pollAttemptsPayload.data) {
        setPollAttempts(pollAttemptsPayload.data);
      } else {
        failures.push(
          pollAttemptsPayload.message || "Unable to load courier polls.",
        );
      }
      if (pollingQueueResponse.ok && pollingQueuePayload.data) {
        setPollingQueue(pollingQueuePayload.data);
      } else {
        failures.push(
          pollingQueuePayload.message || "Unable to load polling health.",
        );
      }
      setError(failures.join(" "));
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
    const actionId = `provider-${provider.code}`;
    setPendingAction(actionId);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/shipping/providers/${provider.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !provider.isActive }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(payload.message || "Unable to update provider.");
      setNotice(
        `${provider.name} ${provider.isActive ? "disabled" : "enabled"}.`,
      );
      await load();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update provider.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function retryWebhook(log: CourierWebhookLog) {
    const actionId = `webhook-${log.id}`;
    setPendingAction(actionId);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/shipping/webhooks/${log.id}/retry`, {
        method: "POST",
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to queue callback retry.");
      }
      setNotice("Courier callback retry queued.");
      await load();
    } catch (retryError) {
      setError(
        retryError instanceof Error
          ? retryError.message
          : "Unable to queue callback retry.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function pollShipment(shipment: Shipment) {
    const actionId = `poll-${shipment.id}`;
    setPendingAction(actionId);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/shipping/shipments/${shipment.id}/poll`,
        { method: "POST" },
      );
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to queue shipment poll.");
      }
      setNotice(`Courier poll queued for ${shipment.order?.reference}.`);
      await load();
    } catch (pollError) {
      setError(
        pollError instanceof Error
          ? pollError.message
          : "Unable to queue shipment poll.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <>
      <Topbar
        title="Shipping"
        subtitle={`${shipments.length} shipment${shipments.length === 1 ? "" : "s"}`}
      />
      <main className="space-y-9 p-4 sm:p-8">
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
                  type="button"
                  disabled={!provider.configured || pendingAction !== null}
                  onClick={() => void toggleProvider(provider)}
                  className="mt-5 rounded-full border border-line px-4 py-2 text-[12px] text-ink disabled:opacity-40"
                >
                  {pendingAction === `provider-${provider.code}`
                    ? "Saving…"
                    : provider.isActive
                      ? "Disable"
                      : "Enable"}
                </button>
              </div>
            ))}
            {!loading && providers.length === 0 && (
              <p className="py-8 text-[12px] text-ink2">
                No courier providers are available.
              </p>
            )}
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-700"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-full border border-rose-200 px-3 py-1.5 text-[12px] font-medium"
            >
              Retry shipping data
            </button>
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="rounded-card border border-emerald-200 bg-emerald-50 p-4 text-[13px] text-emerald-700"
          >
            {notice}
          </div>
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
                <p className="flex items-center justify-end gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 ${
                      webhookQueue.available
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {webhookQueue.available
                      ? "Retry queue available"
                      : "Retry queue unavailable"}
                  </span>
                  <span>{webhookQueue.recoverableCount} recoverable</span>
                </p>
                <p className="mt-1">
                  {webhookQueue.scheduleEnabled
                    ? `Sweep every ${webhookQueue.scheduleEveryMinutes} minutes`
                    : "Automatic sweep disabled"}
                </p>
                {webhookQueue.counts && (
                  <p className="mt-1">
                    Waiting {webhookQueue.counts.waiting} · Active{" "}
                    {webhookQueue.counts.active} · Failed{" "}
                    {webhookQueue.counts.failed}
                  </p>
                )}
                {webhookQueue.error && (
                  <p className="mt-1 text-rose-700">{webhookQueue.error}</p>
                )}
              </div>
            )}
          </div>
          <div
            className="mt-5 overflow-x-auto border-y border-line"
            aria-busy={loading}
          >
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-eyebrow text-ink2">
                  <th scope="col" className="px-5 py-3 font-normal">
                    Received
                  </th>
                  <th scope="col" className="px-5 py-3 font-normal">
                    Courier
                  </th>
                  <th scope="col" className="px-5 py-3 font-normal">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3 font-normal">
                    Attempts
                  </th>
                  <th scope="col" className="px-5 py-3 font-normal">
                    Last attempt
                  </th>
                  <th scope="col" className="px-5 py-3 font-normal">
                    Evidence
                  </th>
                  <th scope="col" className="px-5 py-3 font-normal">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {webhookLogs.map((log) => {
                  const status = webhookStatus(log);
                  return (
                    <tr key={log.id} className="text-[13px]">
                      <td className="px-5 py-3.5 text-ink2">
                        {new Date(log.receivedAt).toLocaleString("en-BD")}
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
                          ? new Date(log.lastAttemptAt).toLocaleString("en-BD")
                          : "Not started"}
                      </td>
                      <td className="max-w-[360px] px-5 py-3.5 text-ink2">
                        {log.processingError ||
                          (log.processedAt
                            ? `Completed ${new Date(log.processedAt).toLocaleString("en-BD")}`
                            : "Awaiting processing")}
                      </td>
                      <td className="px-5 py-3.5">
                        {webhookQueue?.available &&
                        log.authValid &&
                        !log.processed &&
                        !log.processingStartedAt &&
                        log.attemptCount < webhookQueue.maxAttempts ? (
                          <button
                            type="button"
                            onClick={() => void retryWebhook(log)}
                            disabled={pendingAction !== null}
                            className="rounded-full border border-line px-3 py-1.5 text-[11px] text-ink"
                          >
                            {pendingAction === `webhook-${log.id}`
                              ? "Queueing…"
                              : "Queue retry"}
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
                {loading && webhookLogs.length === 0 && (
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
                <p className="flex items-center justify-end gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 ${
                      pollingQueue.available
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {pollingQueue.available
                      ? "Polling queue available"
                      : "Polling queue unavailable"}
                  </span>
                  <span>{pollingQueue.eligibleCount} eligible</span>
                </p>
                <p className="mt-1">
                  {pollingQueue.scheduleEnabled
                    ? `Poll every ${pollingQueue.scheduleEveryMinutes} minutes`
                    : "Automatic polling disabled"}
                </p>
                {pollingQueue.counts && (
                  <p className="mt-1">
                    Waiting {pollingQueue.counts.waiting} · Active{" "}
                    {pollingQueue.counts.active} · Failed{" "}
                    {pollingQueue.counts.failed}
                  </p>
                )}
                {pollingQueue.error && (
                  <p className="mt-1 text-rose-700">{pollingQueue.error}</p>
                )}
              </div>
            )}
          </div>
          <div
            className="mt-5 overflow-x-auto border-y border-line"
            aria-busy={loading}
          >
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-eyebrow text-ink2">
                  <th scope="col" className="px-5 py-3 font-normal">
                    Order
                  </th>
                  <th scope="col" className="px-5 py-3 font-normal">
                    Customer
                  </th>
                  <th scope="col" className="px-5 py-3 font-normal">
                    Courier
                  </th>
                  <th scope="col" className="px-5 py-3 font-normal">
                    Tracking
                  </th>
                  <th scope="col" className="px-5 py-3 font-normal">
                    COD
                  </th>
                  <th scope="col" className="px-5 py-3 font-normal">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3 font-normal">
                    Polling
                  </th>
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
                        {formatEnum(shipment.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {shipment.provider.pollingConfigured &&
                      !["DELIVERED", "RETURNED", "CANCELLED", "RTO"].includes(
                        shipment.status,
                      ) ? (
                        <button
                          type="button"
                          onClick={() => void pollShipment(shipment)}
                          disabled={pendingAction !== null}
                          className="rounded-full border border-line px-3 py-1.5 text-[11px] text-ink disabled:opacity-40"
                        >
                          {pendingAction === `poll-${shipment.id}`
                            ? "Queueing…"
                            : "Poll now"}
                        </button>
                      ) : (
                        <span className="text-[11px] text-ink2">
                          {shipment.pollingError || "Not configured"}
                        </span>
                      )}
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
                {loading && shipments.length === 0 && (
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
          <div
            className="mt-5 overflow-x-auto border-y border-line"
            aria-busy={loading}
          >
            <table className="w-full min-w-[780px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-eyebrow text-ink2">
                  <th scope="col" className="px-5 py-3 font-normal">
                    Created
                  </th>
                  <th scope="col" className="px-5 py-3 font-normal">
                    Order
                  </th>
                  <th scope="col" className="px-5 py-3 font-normal">
                    Courier
                  </th>
                  <th scope="col" className="px-5 py-3 font-normal">
                    Result
                  </th>
                  <th scope="col" className="px-5 py-3 font-normal">
                    Evidence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pollAttempts.map((attempt) => (
                  <tr key={attempt.id} className="text-[13px]">
                    <td className="px-5 py-3.5 text-ink2">
                      {new Date(attempt.createdAt).toLocaleString("en-BD")}
                    </td>
                    <td className="px-5 py-3.5 text-ink">
                      <Link
                        href={`/dashboard/orders/${attempt.shipment.order.id}`}
                        className="underline decoration-line underline-offset-4 hover:decoration-ink"
                      >
                        {attempt.shipment.order.reference}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-ink2">
                      {attempt.shipment.provider.name}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] ${attempt.status === "SUCCEEDED" ? "bg-emerald-50 text-emerald-700" : attempt.status === "FAILED" ? "bg-rose-50 text-rose-700" : "bg-surface text-ink2"}`}
                      >
                        {formatEnum(attempt.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-ink2">
                      {attempt.errorMessage ||
                        (attempt.normalizedStatus
                          ? formatEnum(attempt.normalizedStatus)
                          : "") ||
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
                {loading && pollAttempts.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-14 text-center text-[13px] text-ink2"
                    >
                      Loading courier poll evidence…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <RtoQueue />
      </main>
    </>
  );
}
