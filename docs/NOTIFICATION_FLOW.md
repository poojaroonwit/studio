# FitScan Email & Notification Flow

FitScan keeps recruiters informed through a dual-channel notification system: **In-App Alerts** (Real-time) and **Email Notifications** (SMTP).

---

## 🔔 Notification Lifecycle

```mermaid
sequenceDiagram
    participant Sys as System Event
    participant NS as NotificationService
    participant DB as PostgreSQL
    participant Hub as SSE Hub
    participant UI as Browser (Recruiter)
    participant ES as EmailService

    Sys->>NS: createNotification(userId, data)
    NS->>DB: Save Notification (isRead: false)
    
    par Real-time Alert
        NS->>Hub: broadcastNotification(...)
        Hub-->>UI: data: { "type": "notification", ... }
        Note over UI: Toast alert appears
    and Email Delivery (Optional)
        NS->>ES: sendEmail(to, subject, body)
        ES-->>UI: Mail delivered via SMTP
    end
```

---

## 🛠️ Implementation Breakdown

### 1. In-App Notifications (`notificationService.ts`)
- **Persistence**: Every alert is saved to the `Notification` table, allowing users to view their history.
- **Self-Notification Prevention**: The system intelligently blocks notifications where the `actingUserId` is the same as the target `userId` (e.g., you don't get a notification when *you* update a candidate).
- **Real-time Link**: Uses the **SSE Mechanism** to push updates instantly to the browser without a page refresh.

### 2. Email Service (`emailService.ts`)
- **Engine**: Powered by **Nodemailer**.
- **Configuration**: Managed via System Settings (`emailSmtpHost`, `emailSmtpUser`, etc.) rather than hardcoded environment variables, allowing for runtime adjustments.
- **Fail-safe**: Includes a `testEmailConnection()` utility to verify SMTP health from the Admin dashboard.

---

## 📋 Triggered Events

| Event Type | Logic | Recipient |
| :--- | :--- | :--- |
| **Position Assigned** | A recruiter is linked to a new job opening. | Assigned Recruiter |
| **Candidate Added** | A new resume is successfully processed/uploaded. | Position Recruiter |
| **Status Changed** | A candidate moves to a new recruitment stage. | Position Recruiter |
| **SLA Alert** | A candidate has been stuck in a stage for too long. | Admin / Recruiter |

---

## ⚙️ Configuration
 recruiters can toggle email alerts in their **Profile Preferences**. System-wide SMTP settings are located in the **Settings > System Configuration** tab.
