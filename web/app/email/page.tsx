"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Email = { id: string; subject?: string; snippet?: string; from?: string; };
export default function EmailList() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [accountEmail, setAccountEmail] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("http://localhost:4000/api/accounts");
        const rows = await r.json();
        const g = rows.find((x: any) => x.provider === "google");
        setAccountEmail(g?.account_email || "");
      } catch (e) {
        setStatus("Failed to load accounts.");
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:4000/gmail/list?limit=50");
        const data = await res.json();
        setEmails(data.emails || []);
      } catch (e: any) {
        setStatus(e?.message || "Failed to load inbox.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div>Loading…</div>;
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Inbox</h2>
      {status && <p style={{ color: "crimson" }}>{status}</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {emails.map((e) => (
          <li key={e.id} style={{ padding: 12, borderBottom: '1px solid #eee' }}>
            <Link href={`/email/${encodeURIComponent(e.id)}${accountEmail ? `?account=${encodeURIComponent(accountEmail)}` : ""}`}>
              <div style={{ fontWeight: 600 }}>{e.subject || "(No Subject)"}</div>
              {e.from && <div style={{ color: "#666", fontSize: 12 }}>From: {e.from}</div>}
              <div style={{ color: "#555" }}>{e.snippet}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
