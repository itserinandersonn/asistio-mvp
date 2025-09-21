"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Email = {
  id: string;
  subject: string;
  from: string;
  to?: string;
  cc?: string;
  body: string;
  snippet?: string;
  headers?: Array<{ name: string; value: string }>;
};

type EventPayload = {
  title: string;
  description: string;
  start: string;
  end?: string | null;
  attendees?: string[];
  location?: string | null;
};

export default function EmailView({ emailId: propEmailId }: { emailId?: string }) {
  const params = useParams();
  const search = useSearchParams();
  const emailId =
    propEmailId ||
    (typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params?.id[0] : "") ||
    "";

  const queryAccount = search?.get("account") || "";
  const [accountEmail, setAccountEmail] = useState<string>(queryAccount);
  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [acctLoading, setAcctLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");

  const hasInputs = useMemo(() => Boolean(emailId && accountEmail), [emailId, accountEmail]);

  useEffect(() => {
    if (accountEmail) return;
    let cancelled = false;
    (async () => {
      try {
        setAcctLoading(true);
        const res = await fetch("http://localhost:4000/api/accounts");
        const rows = await res.json();
        const g = rows.find((x: any) => x.provider === "google");
        if (!cancelled && g?.account_email) setAccountEmail(g.account_email);
      } catch (e) {
        if (!cancelled) setStatus("Could not load a connected Google account from /api/accounts.");
      } finally {
        if (!cancelled) setAcctLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [accountEmail]);

  const findHeader = (headers: any[] | undefined, name: string) =>
    headers?.find((h: any) => h.name === name)?.value || "";

  const fetchEmailEitherWay = async (acct: string, id: string): Promise<Email> => {
    const apiUrl = `http://localhost:4000/api/emails/google/${encodeURIComponent(acct)}/${encodeURIComponent(id)}`;
    try {
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        return {
          id: data.id || id,
          subject: data.subject || findHeader(data.headers, "Subject") || "",
          from: data.from || findHeader(data.headers, "From") || "",
          to: data.to || findHeader(data.headers, "To") || "",
          cc: data.cc || findHeader(data.headers, "Cc") || "",
          body: data.body || data.snippet || "",
          snippet: data.snippet,
          headers: data.headers || [],
        };
      }
    } catch {}
    const gmailUrl = new URL("http://localhost:4000/gmail/message");
    gmailUrl.searchParams.set("id", id);
    const r2 = await fetch(gmailUrl.toString());
    if (!r2.ok) {
      const t = await r2.text();
      throw new Error(`GET /gmail/message failed: ${r2.status} ${t}`);
    }
    const d2 = await r2.json();
    const headers = d2.headers || d2.payload?.headers || [];
    const body = d2.body || d2.text || d2.snippet || "";
    return {
      id: d2.id || id,
      subject: d2.subject || findHeader(headers, "Subject") || "",
      from: d2.from || findHeader(headers, "From") || "",
      to: d2.to || findHeader(headers, "To") || "",
      cc: d2.cc || findHeader(headers, "Cc") || "",
      body,
      snippet: d2.snippet,
      headers,
    };
  };

  useEffect(() => {
    let cancelled = false;
    if (!emailId) { setLoading(false); setStatus("No email id provided."); return; }
    if (!accountEmail) { if (!acctLoading) setLoading(false); return; }
    (async () => {
      try {
        setLoading(true);
        const normalized = await fetchEmailEitherWay(accountEmail, emailId);
        if (!cancelled) { setEmail(normalized); setStatus(""); }
      } catch (err: any) {
        if (!cancelled) setStatus(err?.message || "Failed to load email.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [emailId, accountEmail, acctLoading]);

  const scheduleFromEmail = async () => {
    if (!email) return;
    if (!accountEmail) { setStatus("No connected Google account found."); return; }
    setStatus("Parsing & scheduling...");
    try {
      const resp = await fetch("http://localhost:4000/api/schedule/from-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google", account: accountEmail, messageId: email.id }),
      });
      const json = await resp.json();
      if (!json.ok) { setStatus(json.reason || json.error || "Failed to schedule."); return; }
      const evt: EventPayload | undefined = json.event;
      setStatus(evt ? `Meeting: ${evt.title} — ${evt.start}${evt.end ? ` → ${evt.end}` : ""}` : "Meeting generated.");
    } catch (e) {
      setStatus("Error scheduling meeting.");
    }
  };

  if (loading) return <div>Loading email...</div>;
  if (!accountEmail) {
    return (
      <div>
        <p><strong>No Google account detected.</strong></p>
        <p>Open with <code>?account=&lt;your_gmail&gt;</code> or ensure <code>/api/accounts</code> returns a Google account.</p>
        {status && <p style={{ color: "crimson" }}>{status}</p>}
      </div>
    );
  }
  if (!email) {
    return (
      <div>
        <p>Couldn’t load this email.</p>
        {status && <p style={{ color: "crimson" }}>{status}</p>}
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", padding: 16, borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", maxWidth: 720, margin: "24px auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{email.subject || "(No Subject)"}</h1>
      <div style={{ marginBottom: 12, color: "#444", fontSize: 14 }}>
        <div><strong>From:</strong> {email.from || "N/A"}</div>
        <div><strong>To:</strong> {email.to || "N/A"}</div>
        {email.cc && <div><strong>Cc:</strong> {email.cc}</div>}
      </div>
      <div style={{ whiteSpace: "pre-wrap", marginBottom: 16 }}>{email.body || email.snippet}</div>
      <button onClick={scheduleFromEmail} style={{ background: "#2563eb", color: "#fff", padding: "8px 12px", borderRadius: 6, border: "none" }}>Schedule Meeting</button>
      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </div>
  );
}
