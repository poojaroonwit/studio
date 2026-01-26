# FitScan Process Queue Flow

FitScan uses an asynchronous queue to handle resume processing, ensuring that heavy tasks like PDF parsing and AI analysis don't block the user interface.

---

## 🔄 Resume Processing Lifecycle

The lifecycle of a resume from upload to database ingestion follows this flow:

```mermaid
sequenceDiagram
    participant UI as Browser (Recruiter)
    participant API as Next.js API
    participant S3 as MinIO (Object Storage)
    participant DB as PostgreSQL (upload_queue)
    participant Proc as Queue Processor (Lib)
    participant n8n as n8n / External AI

    %% Ingestion Phase
    UI->>API: Upload Resume (PDF/Docx)
    API->>S3: Store File
    API->>DB: Insert Job (Status: 'pending')
    API-->>UI: 202 Accepted (Job ID)

    %% Processing Phase
    Note over Proc: Triggered by UI or Scheduled Task
    Proc->>DB: Fetch Pending Job
    Proc->>DB: Set Status: 'processing'
    Proc->>S3: Download File / Generate Signed URL
    Proc->>n8n: POST to /resume-webhook (Metadata + URL)

    %% Action Phase
    Note over n8n: Parse Resume -> Extract Skills/Experience
    n8n->>API: POST /api/v2/candidates (Structured Data)
    API->>DB: Create Candidate Record

    %% Completion Phase
    Proc->>DB: Set Status: 'success'
    Proc->>API: Dispatch SSE (Progress Update)
    API-->>UI: Real-time Update: "Candidate Processed"
```

---

## 🛠️ Key Components

### 1. The Queue Table (`upload_queue`)
Stores the state of every upload.
- **Fields**: `status` (pending, processing, success, failed), `file_path`, `error_details`, `webhook_payload`.
- **Custom Data**: Stores additional metadata like `targetPositionId` in a JSONB field to be passed to the processor.

### 2. The Processor (`uploadQueueProcessor.ts`)
The engine that drives the queue.
- **Memory Optimization**: Streams files from MinIO to avoid memory spikes with large documents.
- **Idempotency**: Generates unique keys to prevent the same resume from being processed twice if n8n retries.
- **Error Handling**: Captures logs and stack traces into the database if the external service fails.

### 3. Retry Logic (`uploadQueueRetry.ts`)
- Implements **Exponential Backoff** for transient network failures.
- Captures a history of retry attempts in the `webhook_payload` for audit trail visibility.

---

## ⚙️ Trigger Mechanisms

| Trigger Method | Description |
| :--- | :--- |
| **Immediate** | Triggered automatically after a successful file upload to MinIO. |
| **Bulk Action** | Triggered by the recruiter from the "Process Queue" dashboard for legacy or failed uploads. |
| **Blocking API** | `/api/upload-queue/blocking-process` - Waits for the process to finish before responding (used for single uploads). |
| **Auto-Retry** | Scheduled system task that finds `failed` jobs and retries them based on the retry configuration. |

---

## 📊 Status Transitions
- `pending`: Job created, waiting for resources.
- `processing`: Processor has grabbed the job and is talking to the AI service.
- `success`: AI service replied, and candidate data is synced.
- `failed`: An error occurred (e.g., file too large, n8n offline). The `error_details` field contains the stack trace.
