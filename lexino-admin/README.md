# Lexino AI — Standalone Private Local Admin Suite

This is the dedicated, private administrative console for Lexino AI ([lexinoai.in](https://www.lexinoai.in/)).
It runs locally on your machine on port `3001` and connects directly to your Neon PostgreSQL production database.

---

## 🚀 Quick Start (Local Launch)

From the project root:

```bash
cd lexino-admin
npm run dev
```

Open your browser to:
👉 **[http://localhost:3001](http://localhost:3001)**

---

## ⚡ Features & Capabilities

1. **Live User Search**:
   - Search ANY user account by **Email** (`user@gmail.com`), **Clerk User ID** (`user_...`), or **Name**.

2. **Manual 1-Month Plan Activations**:
   - **`+ Student (1 Mo)`**: Sets user to `STUDENT` plan with an exact 1-month calendar expiry date (`now + 30 days`).
   - **`+ Pro (1 Mo)`**: Sets user to `PRO / UNLIMITED` plan with an exact 1-month calendar expiry date (`now + 30 days`).

3. **Subscription Extensions**:
   - **`+1 Mo Extend`**: Extends active subscription by +30 days from the current expiry date (stacking renewals).

4. **Deactivations & Plan Changes**:
   - **`Deactivate`**: Downgrades the account to `FREE` immediately while retaining payment and chat records.

5. **Security & Audit Logs**:
   - Every manual action is logged to the `AdminAuditLog` table in PostgreSQL with timestamp, target user, admin ID, and reason.

---

## 🔒 Security

- Zero public exposure: This dashboard is completely decoupled from the public `lexinoai.in` web application.
- All actions execute server-side database mutations.
