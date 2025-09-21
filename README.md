# Asistio — Fresh Scaffold

This bundle includes:
- **server/** (Express API with Gmail + OpenAI)
- **web/** (Next.js app with inbox + detail + schedule)

## Quick Start

### 1) API (server)
```bash
cd server
cp .env.example .env
# fill: OPENAI_API_KEY, GOOGLE_* creds, GOOGLE_ACCOUNT_EMAIL
npm i
npm run dev
```

### 2) Web (Next.js)
```bash
cd ../web
npm i
npm run dev
```

- API: http://localhost:4000
- Web: http://localhost:3000

### Use it
- http://localhost:3000/email → lists inbox from `/gmail/list`
- open a message → `/email/[id]?account=YOUR_GMAIL`
- click **Schedule Meeting** on the detail page

### API routes
- `GET /api/accounts` → `[ { provider:'google', account_email } ]`
- `GET /gmail/list` → inbox list
- `GET /gmail/message?id=` → message
- `GET /api/emails/google/:account/:id` → normalized message
- `POST /api/schedule/from-email` → AI event JSON
