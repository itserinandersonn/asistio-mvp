import { google } from 'googleapis';
import express from 'express';
import fetch from 'node-fetch';
import OpenAI from 'openai';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getOauth2Client() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oauth2;
}

function decodeB64Url(s = "") {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, "base64").toString("utf8");
}

function extractBody(payload) {
  if (!payload) return "";
  let body = "";
  if (payload.body?.data) body += decodeB64Url(payload.body.data);
  if (payload.parts) for (const p of payload.parts) body += extractBody(p);
  return body;
}

// ---- Accounts ----
router.get('/api/accounts', async (req, res) => {
  const email = process.env.GOOGLE_ACCOUNT_EMAIL || "";
  const out = [];
  if (email) out.push({ provider: 'google', account_email: email });
  res.json(out);
});

// ---- Gmail: list inbox ----
router.get('/gmail/list', async (req, res) => {
  try {
    const oauth2 = getOauth2Client();
    const gmail = google.gmail({ version: 'v1', auth: oauth2 });

    const { pageToken, limit } = req.query;
    const list = await gmail.users.messages.list({
      userId: 'me',
      maxResults: Number(limit || 25),
      q: 'in:inbox',
      pageToken: pageToken || undefined,
    });
    const msgs = list.data.messages || [];

    const emails = [];
    for (const m of msgs) {
      const got = await gmail.users.messages.get({
        userId: 'me',
        id: m.id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });
      const headers = got.data.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      emails.push({
        id: m.id,
        snippet: got.data.snippet,
        subject,
        from,
        headers,
      });
    }

    res.json({
      emails,
      nextPageToken: list.data.nextPageToken || null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ---- Gmail: get single message (fallback route) ----
router.get('/gmail/message', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });

    const oauth2 = getOauth2Client();
    const gmail = google.gmail({ version: 'v1', auth: oauth2 });
    const msg = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });

    const headers = msg.data.payload?.headers || [];
    const find = n => headers.find(h => h.name === n)?.value || '';
    const body = extractBody(msg.data.payload);

    res.json({
      id,
      subject: find('Subject'),
      from: find('From'),
      to: find('To'),
      cc: find('Cc'),
      snippet: msg.data.snippet,
      headers,
      body,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ---- Normalized email by account/id (uses env account) ----
router.get('/api/emails/google/:account/:id', async (req, res) => {
  try {
    const { account, id } = req.params;
    const configured = process.env.GOOGLE_ACCOUNT_EMAIL;
    if (!configured || configured !== decodeURIComponent(account)) {
      return res.status(404).json({ error: 'google account not found (check GOOGLE_ACCOUNT_EMAIL)' });
    }
    const oauth2 = getOauth2Client();
    const gmail = google.gmail({ version: 'v1', auth: oauth2 });
    const msg = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });

    const headers = msg.data.payload?.headers || [];
    const pick = n => headers.find(h => h.name === n)?.value || '';
    const subject = pick('Subject');
    const from = pick('From');
    const to = pick('To');
    const cc = pick('Cc');
    const body = extractBody(msg.data.payload);

    res.json({ id, subject, from, to, cc, snippet: msg.data.snippet, headers, body });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ---- AI: schedule-from-email ----
router.post('/api/schedule/from-email', async (req, res) => {
  try {
    const { provider, account, messageId } = req.body || {};
    if (!provider || !account || !messageId) {
      return res.status(400).json({ ok: false, error: 'Missing parameters' });
    }

    // fetch normalized email
    const base = `http://localhost:${process.env.PORT || 4000}`;
    const url = `${base}/api/emails/google/${encodeURIComponent(account)}/${encodeURIComponent(messageId)}`;
    const r = await fetch(url);
    const email = await r.json();
    if (email.error) throw new Error(email.error);

    const to = email.to || (email.headers?.find(h => h.name === 'To')?.value || '');
    const cc = email.cc || (email.headers?.find(h => h.name === 'Cc')?.value || '');
    const attendees = [...to.split(','), ...cc.split(',')].map(x => x.trim()).filter(Boolean);

    const prompt = `Extract a meeting event from this email. Return ONLY JSON:
{
  "schedule": true|false,
  "title": "...",
  "description": "...",
  "attendees": ["a@b.com"],
  "start": "YYYY-MM-DDTHH:mm:ssZ",
  "end": "YYYY-MM-DDTHH:mm:ssZ",
  "location": "Zoom / 123 Main St"
}

Email:
Subject: ${email.subject || ''}
From: ${email.from || ''}
To: ${to}
Cc: ${cc}
Body: """${(email.body || email.snippet || '').slice(0, 6000)}"""`;

    const ai = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 600,
    });

    const raw = ai.choices?.[0]?.message?.content || "";
    let parsed;
    try {
      parsed = JSON.parse(raw.trim());
    } catch {
      parsed = {
        schedule: false,
        title: email.subject || 'Meeting',
        description: (email.body || email.snippet || '').slice(0, 1000),
        attendees,
        start: null,
        end: null,
        location: null
      };
    }

    if (!parsed.schedule) return res.json({ ok: false, reason: "LLM decided not to schedule", event: parsed });
    return res.json({ ok: true, event: parsed });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
