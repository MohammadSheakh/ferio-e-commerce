"use client";
import { useState, FormEvent } from "react";
import {
  readJsonRecord,
  responseDataString,
  responseMessage,
} from "@/lib/client-response";

export function CreateOrganizationForm() {
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/platform/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        slug: form.get("slug"),
        ownerEmail: form.get("ownerEmail"),
      }),
    });
    const data = await readJsonRecord(response);
    setWorking(false);
    if (response.ok) {
      setMessage(`Created. Next: run provisioning for ${responseDataString(data, "slug")}.`);
      window.location.reload();
    } else {
      setMessage(responseMessage(data, "Creation failed."));
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="grid3">
        <div>
          <label htmlFor="name">Business name</label>
          <input id="name" name="name" required className="input" />
        </div>
        <div>
          <label htmlFor="slug">Slug (subdomain)</label>
          <input id="slug" name="slug" required className="input" placeholder="acme-store" />
        </div>
        <div>
          <label htmlFor="ownerEmail">Owner email</label>
          <input id="ownerEmail" name="ownerEmail" type="email" required className="input" />
        </div>
      </div>
      <div style={{ height: 16 }} />
      <button className="pill" disabled={working}>
        {working ? "Creating…" : "Create organization"}
      </button>
      {message && <span style={{ marginLeft: 12, fontSize: 13, color: "#6e6e73" }}>{message}</span>}
    </form>
  );
}
