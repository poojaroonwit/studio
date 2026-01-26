# n8n & FitScan Integration Detail

The interaction between **n8n** and **FitScan** is bi-directional, allowing for automated workflows triggered by app events and programmatic control of the app from n8n.

---

## 🔄 Bi-Directional Communication

### 1. App ➡️ n8n (Outgoing Webhooks)
FitScan uses a built-in **Webhook Dispatcher** to notify n8n of specific events.

- **Mechanism**: When an event occurs (e.g., a candidate is created), the `WebhookDispatcher` sends a POST request with a JSON payload to a pre-configured URL (your n8n Webhook Node).
- **Supported Events**:
  - `candidate.created`, `candidate.updated`, `candidate.stage_changed`
  - `position.created`, `position.deleted`
  - `resume.uploaded`, `resume.processed`
  - `upload_queue.completed`, `upload_queue.failed`
- **Security**: Supports Basic Auth, Bearer tokens, or custom headers to ensure only authorized requests are accepted by n8n.

### 2. n8n ➡️ App (REST API V2)
n8n can perform actions in FitScan (like updating a candidate's status or fetching report data) using the **V2 API**.

- **Authentication**: n8n uses **System API Keys** for secure access.
- **n8n Compatibility**: The `/api/v2/auth/login` endpoint specifically supports the `Authorization: Bearer <sk_live_...>` header format, which is the standard for n8n's "Header Auth" or "HTTP Request" nodes.
- **Workflow**:
  1. n8n sends the API Key to `/api/v2/auth/login`.
  2. The app validates the key and returns a JWT token.
  3. n8n uses this token for subsequent API calls (e.g., `GET /api/v2/candidates`).

---

## 🛠️ Configuration Example

### In FitScan (Settings > Webhooks)
Create a new webhook for n8n:
- **URL**: `https://your-n8n-instance.com/webhook/candidate-alert`
- **Events**: Select `candidate.created`
- **Auth**: Set a secret header `X-N8N-Token` for validation.

### In n8n (HTTP Request Node)
To call the FitScan API:
- **Method**: `POST`
- **URL**: `https://your-fitscan-app.com/api/v2/auth/login`
- **Headers**: `X-API-Key: sk_live_your_key_here`
- **Response**: Use the returned `token` in the `Authorization` header for future nodes.

---

## 🧩 Shared Infrastructure
- **Database**: In many deployments, n8n and FitScan share the same **PostgreSQL** instance but operate on different databases (e.g., `fitscan_db` and `n8n_db`).
- **Environment**: Both are typically containerized via Docker, allowing them to communicate over a private internal network (e.g., `http://n8n:8921`).

---

## 💡 Common Workflows
1. **Auto-Slack**: User moves candidate to "Hired" ➡️ Webhook triggers n8n ➡️ n8n sends a celebratory message to Slack.
2. **External Enrichment**: New candidate uploaded ➡️ Webhook triggers n8n ➡️ n8n fetches LinkedIn data and updates the candidate via API.
3. **Daily Reports**: n8n cron job triggers ➡️ Calls FitScan API to get daily stats ➡️ Formats an email and sends to the HR head.
