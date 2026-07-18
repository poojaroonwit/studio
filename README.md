# HRI - Applicant Tracking System

HRI is a modern Applicant Tracking System for applicant management, resume processing, job matching, interview workflows, analytics, and configurable automation.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15, React 18, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Auth.js, Prisma |
| Database | PostgreSQL |
| Storage | S3-compatible object storage |
| AI | Configurable AI/webhook integrations |
| Real-time | Server-Sent Events |
| Deployment | Docker |

## Features

- Applicant profiles, resumes, comments, attachments, and stage tracking
- Position and headcount management
- Role-based access control with optional Azure AD SSO
- AI-assisted resume parsing, evaluation, and job matching
- Upload queue processing built into the app service
- Public application pages for unauthenticated candidates
- Runtime system settings for processing, prompts, branding, and integrations
- Audit logs, notifications, dashboards, and SLA analytics

## Quick Start

```bash
git clone <repository-url>
cd studio-1
cp env.local.template .env.local
docker compose up -d
```

The app runs on:

```text
http://localhost:8021
```

## Required Environment Variables

For a basic deployment, configure:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
NEXTAUTH_SECRET=generate-a-secure-secret
NEXTAUTH_URL=https://your-app.example.com

STORAGE_PROVIDER=s3-compatible
STORAGE_ENDPOINT=https://your-storage-endpoint
STORAGE_ACCESS_KEY_ID=your-storage-access-key
STORAGE_SECRET_ACCESS_KEY=your-storage-secret-key
STORAGE_BUCKET=your-bucket-name
STORAGE_PUBLIC_BASE_URL=https://your-storage-public-base-url
```

For the initial admin account, set these before the first seed:

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-password
```

If `ADMIN_PASSWORD` is not provided, the seed script generates a random password and prints it once in startup logs.

## Deployment Notes

- The Docker image starts through `entrypoint.sh`.
- `entrypoint.sh` waits for PostgreSQL, creates or syncs the schema, runs seed data, then starts Next.js.
- Leave `SKIP_MIGRATIONS` unset or `false` for fresh deployments.
- If your platform has a custom start command, do not set it to `npm run start`; that bypasses database preparation.
- Built-in upload queue processing does not need a separate worker service.
- `PROCESSOR_API_KEY` and `UPLOAD_QUEUE_PROCESS_URL` are only needed when using an external worker.

## Public Applications

- Public candidates can apply from `/apply` or a direct role URL such as `/apply/business-analyst-abc12345`.
- The public API is `/api/public/apply`; it stores the resume in configured S3-compatible storage, creates an upload queue job, and processes it through the built-in queue processor.
- Admins can enable or disable public applications in System Settings -> Feature Configuration.
- Optional public apply controls in System Settings include captcha protection, applicant confirmation email, and recruiter notification email.
- Position URLs are generated automatically. To customize a role URL, set `customAttributes.publicApplySlug` on the position, for example `business-analyst`.
- Email notifications use the SMTP configuration from System Settings, not deployment environment variables.

## Optional Integrations

- Azure AD SSO through Azure application credentials
- External resume/PDF processing webhooks
- API key based automation through system API keys
- S3-compatible object storage from providers such as AWS S3, Railway buckets, or compatible vendors

## Useful Commands

```bash
npm run dev          # Start local development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
npm run test:run     # Run tests
```

Database:

```bash
npx prisma db push --schema=prisma/schema.prisma
npx prisma db seed
npx prisma studio
```

## Documentation

Detailed documentation lives in `docs/`.

Key starting points:

- [Architecture Overview](docs/architecture/Architecture.md)
- [Security Architecture](docs/architecture/Security.md)
- [System Configuration](docs/architecture/System%20Configuration.md)
- [Development Guide](docs/development/Development%20Guide.md)
- [API Overview](docs/development/API%20Overview.md)
- [Installation Guide](docs/infrastructure/Installation%20Guide.md)
- [Migration Guide](docs/infrastructure/Migration%20Guide.md)
- [Backup & Recovery](docs/infrastructure/Backup%20&%20Recovery.md)

## Project Structure

```text
studio-1/
├── src/
│   ├── app/           # Next.js App Router pages and API routes
│   ├── components/    # React components
│   ├── lib/           # Server/client utilities
│   ├── hooks/         # React hooks
│   └── types/         # TypeScript types
├── prisma/            # Database schema, migrations, and seed
├── scripts/           # Utility scripts
├── docs/              # Product and engineering documentation
└── docker-compose.yml
```

## Security

- Always set a strong `NEXTAUTH_SECRET`.
- Always set `ADMIN_PASSWORD` before first production seed.
- Do not commit real `.env` files or production secrets.
- Keep object storage private unless a specific public asset workflow requires otherwise.

## License

This project is licensed under the MIT License.
