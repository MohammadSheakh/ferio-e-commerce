"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import {
  STAFF_PERMISSION_GROUPS,
  StaffAccessOverview,
  StaffAccessStatus,
  StaffMember,
} from "@/lib/staff-access";

const emptyOverview: StaffAccessOverview = {
  staff: [],
  pendingInvitations: [],
};

function PermissionGrid({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (permissions: string[]) => void;
}) {
  function toggle(permission: string) {
    onChange(
      selected.includes(permission)
        ? selected.filter((item) => item !== permission)
        : [...selected, permission],
    );
  }

  return (
    <div className="space-y-5">
      {STAFF_PERMISSION_GROUPS.map((group) => (
        <fieldset key={group.label}>
          <legend className="text-[11px] uppercase tracking-eyebrow text-ink2">
            {group.label}
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {group.permissions.map(([permission, label]) => (
              <label
                key={permission}
                className="flex cursor-pointer items-start gap-2.5 rounded-card border border-line px-3 py-2.5 text-[13px] text-ink"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(permission)}
                  onChange={() => toggle(permission)}
                  className="mt-0.5 h-4 w-4 accent-black"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

export default function StaffPage() {
  const [overview, setOverview] = useState(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [setupLink, setSetupLink] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePermissions, setInvitePermissions] = useState<string[]>([]);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [editStatus, setEditStatus] = useState<StaffAccessStatus>("active");
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [confirmResetId, setConfirmResetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/staff", { cache: "no-store" });
      const payload = (await response.json()) as {
        data?: StaffAccessOverview;
        message?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Unable to load staff access.");
      }
      setOverview(payload.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load staff access.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    setSetupLink("");
    try {
      const response = await fetch("/api/staff/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteName,
          email: inviteEmail,
          permissions: invitePermissions,
        }),
      });
      const payload = (await response.json()) as {
        data?: { setupToken?: string };
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to invite staff.");
      }
      setNotice(`Invitation queued for ${inviteEmail.trim().toLowerCase()}.`);
      if (payload.data?.setupToken) {
        setSetupLink(
          `${window.location.origin}/staff-access#purpose=invite&token=${encodeURIComponent(payload.data.setupToken)}`,
        );
      }
      setInviteName("");
      setInviteEmail("");
      setInvitePermissions([]);
      setShowInvite(false);
      await load();
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : "Unable to invite staff.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openAccess(member: StaffMember) {
    setEditing(member);
    setEditStatus(member.staffAccessStatus ?? "active");
    setEditPermissions(member.staffPermissions);
    setError("");
  }

  async function saveAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    setSetupLink("");
    try {
      const response = await fetch(`/api/staff/${editing.id}/access`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          permissions: editPermissions,
        }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to update staff access.");
      }
      setNotice(
        `Access updated for ${editing.name}. Refresh sessions are revoked; any active token expires within 15 minutes.`,
      );
      setEditing(null);
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to update staff access.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function issueReset(member: StaffMember) {
    if (confirmResetId !== member.id) {
      setConfirmResetId(member.id);
      return;
    }
    setSubmitting(true);
    setError("");
    setNotice("");
    setSetupLink("");
    try {
      const response = await fetch(`/api/staff/${member.id}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const payload = (await response.json()) as {
        data?: { setupToken?: string };
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to issue access reset.");
      }
      setNotice(`Reset instructions queued for ${member.email}.`);
      if (payload.data?.setupToken) {
        setSetupLink(
          `${window.location.origin}/staff-access#purpose=reset&token=${encodeURIComponent(payload.data.setupToken)}`,
        );
      }
      setConfirmResetId(null);
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Unable to issue access reset.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const owners = overview.staff.filter((member) => member.role === "admin");
  const staff = overview.staff.filter((member) => member.role === "staff");
  const activeCount = staff.filter(
    (member) => member.staffAccessStatus === "active",
  ).length;
  const inputClass =
    "mt-1.5 w-full rounded-card border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-ink";

  return (
    <>
      <Topbar
        title="Staff access"
        subtitle="Invite operators and limit access by responsibility"
      />
      <div className="space-y-7 p-8">
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            ["Active staff", activeCount],
            ["Inactive staff", staff.length - activeCount],
            ["Pending invitations", overview.pendingInvitations.length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-card border border-line p-5">
              <p className="text-[11px] uppercase tracking-eyebrow text-ink2">
                {label}
              </p>
              <p className="mt-2 text-[26px] font-semibold text-ink">{value}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <div>
            <h2 className="text-[16px] font-medium text-ink">Team access</h2>
            <p className="mt-1 max-w-2xl text-[12px] leading-5 text-ink2">
              Grant only the permissions each person needs. Access changes revoke
              refresh sessions immediately.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-white"
          >
            Invite staff
          </button>
        </section>

        {error && (
          <p role="alert" className="text-[13px] text-rose-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-[13px] text-emerald-700">
            {notice}
          </p>
        )}
        {setupLink && (
          <div className="rounded-card border border-line bg-surface p-4">
            <p className="text-[11px] uppercase tracking-eyebrow text-ink2">
              Development setup link
            </p>
            <p className="mt-2 break-all text-[12px] leading-5 text-ink">
              {setupLink}
            </p>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(setupLink)}
              className="mt-3 rounded-full border border-line bg-paper px-4 py-2 text-[12px] text-ink hover:border-ink"
            >
              Copy link
            </button>
          </div>
        )}

        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[780px] text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-eyebrow text-ink2">
                <th className="px-5 py-3 font-normal">Person</th>
                <th className="px-5 py-3 font-normal">Role</th>
                <th className="px-5 py-3 font-normal">Status</th>
                <th className="px-5 py-3 font-normal">Permissions</th>
                <th className="px-5 py-3 text-right font-normal">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...owners, ...staff].map((member) => (
                <tr key={member.id} className="text-[13px]">
                  <td className="px-5 py-4">
                    <p className="font-medium text-ink">{member.name}</p>
                    <p className="mt-0.5 text-[11px] text-ink2">
                      {member.email}
                    </p>
                  </td>
                  <td className="px-5 py-4 capitalize text-ink2">
                    {member.role === "admin" ? "Owner" : "Staff"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] ${
                        member.role === "admin" ||
                        member.staffAccessStatus === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {member.role === "admin"
                        ? "Active"
                        : member.staffAccessStatus}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-ink2">
                    {member.role === "admin"
                      ? "Full access"
                      : `${member.staffPermissions.length} assigned`}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {member.role === "staff" && (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openAccess(member)}
                          className="rounded-full border border-line px-3 py-1.5 text-[12px] text-ink hover:border-ink"
                        >
                          Edit access
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => void issueReset(member)}
                          className={`rounded-full px-3 py-1.5 text-[12px] ${
                            confirmResetId === member.id
                              ? "bg-ink text-white"
                              : "border border-line text-ink hover:border-ink"
                          }`}
                        >
                          {confirmResetId === member.id
                            ? "Confirm reset"
                            : "Reset access"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && overview.staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center text-ink2">
                    No staff accounts found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center text-ink2">
                    Loading staff access…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {overview.pendingInvitations.length > 0 && (
          <section>
            <h2 className="text-[16px] font-medium text-ink">
              Pending invitations
            </h2>
            <div className="mt-3 divide-y divide-line rounded-card border border-line">
              {overview.pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-[13px]"
                >
                  <div>
                    <p className="font-medium text-ink">
                      {invitation.name || invitation.email}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink2">
                      {invitation.email} · {invitation.permissions.length} permissions
                    </p>
                  </div>
                  <p className="text-[11px] text-ink2">
                    Expires {new Date(invitation.expiresAt).toLocaleString("en-BD")}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {(showInvite || editing) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 px-4 py-10">
          <div className="w-full max-w-3xl rounded-card bg-paper p-6">
            <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
              <div>
                <h2 className="text-[18px] font-semibold text-ink">
                  {editing ? `Access for ${editing.name}` : "Invite staff"}
                </h2>
                <p className="mt-1 text-[12px] text-ink2">
                  Refresh sessions are revoked immediately after access changes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowInvite(false);
                  setEditing(null);
                }}
                className="text-[13px] text-ink2 hover:text-ink"
              >
                Close
              </button>
            </div>

            <form onSubmit={editing ? saveAccess : invite} className="mt-5">
              {!editing && (
                <div className="mb-6 grid gap-4 sm:grid-cols-2">
                  <label className="text-[12px] text-ink2">
                    Name
                    <input
                      required
                      value={inviteName}
                      onChange={(event) => setInviteName(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className="text-[12px] text-ink2">
                    Email
                    <input
                      required
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                </div>
              )}

              {editing && (
                <label className="mb-6 block max-w-xs text-[12px] text-ink2">
                  Access status
                  <select
                    value={editStatus}
                    onChange={(event) =>
                      setEditStatus(event.target.value as StaffAccessStatus)
                    }
                    className={inputClass}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              )}

              <PermissionGrid
                selected={editing ? editPermissions : invitePermissions}
                onChange={editing ? setEditPermissions : setInvitePermissions}
              />

              <div className="mt-7 flex justify-end gap-2 border-t border-line pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setShowInvite(false);
                    setEditing(null);
                  }}
                  className="rounded-full border border-line px-5 py-2.5 text-[13px] text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-white disabled:opacity-50"
                >
                  {submitting
                    ? "Saving…"
                    : editing
                      ? "Save access"
                      : "Send invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
