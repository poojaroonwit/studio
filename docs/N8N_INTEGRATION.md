# N8N Workflow Automation - FitScan Enterprise ATS

**Version:** 1.0 | **Date:** December 16, 2025

---

## 1. Overview

FitScan includes N8N for powerful workflow automation capabilities. N8N allows you to create automated workflows that integrate with your recruitment processes.

---

## 2. Features

- **Visual Workflow Builder**: Drag-and-drop interface
- **Integration Hub**: Connect with 200+ services
- **Webhook Support**: Trigger workflows via HTTP
- **Database Integration**: Direct connection to PostgreSQL
- **Custom Nodes**: Extend functionality
- **Scheduling**: Time-based workflow execution
- **Error Handling**: Robust retry mechanisms

---

## 3. Default Configuration

| Setting | Value |
|---------|-------|
| **URL** | http://localhost:8921 |
| **Username** | admin |
| **Password** | admin |
| **Database** | Same PostgreSQL instance |

---

## 4. Environment Variables

```env
N8N_PORT=8921
N8N_DB_NAME=n8n
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=admin
N8N_HOST=localhost
N8N_PROTOCOL=http
N8N_ENCRYPTION_KEY=your-encryption-key-here
N8N_WEBHOOK_URL=http://localhost:8921/
N8N_TIMEZONE=Asia/Bangkok
N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true
N8N_DB_CONNECTION_TIMEOUT=60000
```

---

## 5. Use Cases

- **Email Notifications**: Send emails when candidates move stages
- **CRM Integration**: Sync candidate data with external CRM
- **Resume Processing**: Automate resume parsing
- **Interview Scheduling**: Integrate with calendar systems
- **Background Checks**: Automate background check processes
- **Reporting**: Generate and send automated reports

---

## 6. Security Notes

⚠️ **Important**:
- Change the default admin password immediately
- Update `N8N_ENCRYPTION_KEY` with a strong, unique key
- Enable HTTPS in production
- Review webhook security settings

---

## Related Docs
- [Installation](./INSTALLATION.md)
- [Architecture](./ARCHITECTURE.md)
- [API Overview](./API_OVERVIEW.md)
