# GitHub Discord Webhook

A self-hosted service that forwards GitHub webhook events to Discord channels with beautifully formatted embeds. Supports multi-user, multi-repo configurations with secure webhook signature verification.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/F9q9vk?referralCode=wANn9j&utm_medium=integration&utm_source=template&utm_campaign=generic)

## Notes for Deploying on Railway

- On first start, the deployment will automatically create an invite code for you to use. You can use this to sign up for an account.

## Features

- **Secure by design** - GitHub webhook signature verification (HMAC-SHA256)
- **Multi-user support** - Each user manages their own webhook mappings
- **Flexible registration** - Open, closed, or invite-only modes
- **Beautiful Discord embeds** - Rich formatting for PR events
- **Easy deployment** - Single binary, auto-migrations, Railway-ready

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime
- PostgreSQL database

### Installation

```bash
# Clone the repository
git clone https://github.com/alexng353/github-discord-webhook.git
cd github-discord-webhook

# Install dependencies
bun install

# Set up environment variables (see below)
cp .env.example .env

# Run the server (auto-runs migrations)
bun run start
```

## Environment Variables

| Variable                | Required | Default       | Description                                                   |
| ----------------------- | -------- | ------------- | ------------------------------------------------------------- |
| `DATABASE_URL`          | ✅       | -             | PostgreSQL connection string (`postgres://...`)               |
| `PORT`                  | ❌       | `3000`        | Server port                                                   |
| `NODE_ENV`              | ❌       | `development` | Environment mode                                              |
| `REGISTRATION`          | ❌       | `open`        | Registration mode: `open`, `closed`, or `invite_only`         |
| `RAILWAY_PUBLIC_DOMAIN` | ❌       | -             | Public domain for generated webhook URLs (Railway deployment) |

### Example `.env`

```bash
DATABASE_URL=postgres://user:password@localhost:5432/webhooks
PORT=3000
REGISTRATION=invite_only
```

## How It Works

### Architecture Overview

```
GitHub Repo -> GitHub Webhook -> This Service -> Discord Webhook -> Discord Channel
```

1. **User registers** and creates a webhook mapping (repo → Discord webhook)
2. **Service generates** a unique GitHub webhook URL
3. **User configures** this URL in their GitHub repository settings
4. **GitHub sends** webhook events to the service
5. **Service verifies** the signature and forwards formatted embeds to Discord

### Authentication Flow

The service has two authentication systems:

#### 1. Session-Based Auth (for Dashboard/API)

Used for managing webhook mappings through the web interface or API.

```
POST /auth/register → Create account
POST /auth/login    → Get session cookie (7-day TTL)
POST /auth/logout   → Invalidate session
GET  /auth/me       → Get current user info
```

#### 2. GitHub Webhook Signature Verification

Each webhook mapping has a **secret** that you also configure in GitHub. When GitHub sends a webhook:

1. GitHub signs the payload with your secret using HMAC-SHA256
2. GitHub sends the signature in `X-Hub-Signature-256` header
3. This service verifies the signature before processing

This ensures only legitimate GitHub webhooks are processed.

### Registration Modes

Configure via `REGISTRATION` environment variable:

| Mode          | Description                                |
| ------------- | ------------------------------------------ |
| `open`        | Anyone can register                        |
| `closed`      | No new registrations allowed               |
| `invite_only` | Requires an invite code from existing user |

When running in `invite_only` mode, the first invite code is printed to the console on startup.

## Setup Guide

### Step 1: Create an Account

```bash
# Check registration mode
curl http://localhost:3000/auth/registration-mode

# Register (if open or with invite code)
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "myuser", "password": "mypassword123", "inviteCode": "abc123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "myuser", "password": "mypassword123"}' \
  -c cookies.txt
```

### Step 2: Get a Discord Webhook URL

1. Open Discord and go to your server
2. Right-click the channel → **Edit Channel** → **Integrations** → **Webhooks**
3. Click **New Webhook**, customize name/avatar
4. Click **Copy Webhook URL**

### Step 3: Create a Webhook Mapping

```bash
curl -X POST http://localhost:3000/webhooks/mapping \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "repo": "owner/repo-name",
    "webhookUrl": "https://discord.com/api/webhooks/123/abc...",
    "secret": "your-github-webhook-secret"
  }'
```

Response:

```json
{
  "created": true,
  "repo": "owner/repo-name",
  "id": "uuid-here",
  "githubWebhookUrl": "https://your-domain.com/webhook/github/uuid-here"
}
```

### Step 4: Configure GitHub

1. Go to your GitHub repository → **Settings** → **Webhooks** → **Add webhook**
2. **Payload URL**: Use the `githubWebhookUrl` from the previous step
3. **Content type**: `application/json`
4. **Secret**: The same secret you used when creating the mapping
5. **Events**: Select "Pull requests" (or "Let me select individual events")
6. Click **Add webhook**

### Step 5: Test It!

Create or close a pull request in your repository. You should see a beautifully formatted embed in your Discord channel!

## API Reference

### Authentication

| Method | Endpoint                  | Auth    | Description                   |
| ------ | ------------------------- | ------- | ----------------------------- |
| `GET`  | `/auth/registration-mode` | -       | Get current registration mode |
| `POST` | `/auth/register`          | -       | Create new account            |
| `POST` | `/auth/login`             | -       | Login, returns session cookie |
| `POST` | `/auth/logout`            | Session | Logout, clears session        |
| `GET`  | `/auth/me`                | Session | Get current user info         |

### Invite Codes (invite_only mode)

| Method   | Endpoint              | Auth    | Description               |
| -------- | --------------------- | ------- | ------------------------- |
| `POST`   | `/auth/invites`       | Session | Create new invite code    |
| `GET`    | `/auth/invites`       | Session | List your invite codes    |
| `DELETE` | `/auth/invites/:code` | Session | Revoke unused invite code |

### Webhook Mappings

| Method   | Endpoint                         | Auth    | Description                     |
| -------- | -------------------------------- | ------- | ------------------------------- |
| `POST`   | `/webhooks/mapping`              | Session | Create new repo→Discord mapping |
| `GET`    | `/webhooks/mapping`              | Session | List your webhook mappings      |
| `GET`    | `/webhooks/mapping/:repo`        | Session | Get specific mapping info       |
| `DELETE` | `/webhooks/mapping/:repo`        | Session | Delete a mapping                |
| `PATCH`  | `/webhooks/mapping/:repo/secret` | Session | Update webhook secret           |

### GitHub Webhook Receiver

| Method | Endpoint              | Auth             | Description                   |
| ------ | --------------------- | ---------------- | ----------------------------- |
| `POST` | `/webhook/github/:id` | GitHub Signature | Receive GitHub webhook events |

### Utility

| Method | Endpoint  | Description           |
| ------ | --------- | --------------------- |
| `GET`  | `/health` | Health check endpoint |

## Supported GitHub Events

Currently supported:

- **Pull Request Opened** - Green embed with PR details
- **Pull Request Closed** - Red embed (or purple if merged)

More events coming soon!

## Development

```bash
# Run in development mode with hot reload
bun run dev

# Lint and format
bun run lint
```

## Database

The service uses PostgreSQL with Drizzle ORM. Migrations run automatically on startup.

### Schema

- `users` - User accounts (id, username, password_hash)
- `sessions` - Login sessions with expiry
- `auth_tokens` - Bearer tokens for API auth
- `webhook_mappings` - Repo → Discord webhook mappings
- `invite_codes` - Registration invite codes

## Deployment

### Railway (Recommended)

1. Connect your GitHub repo to Railway
2. Add a PostgreSQL database
3. Set environment variables:
   - `DATABASE_URL` (auto-set by Railway if using their Postgres)
   - `REGISTRATION=invite_only`
4. Deploy!

The `RAILWAY_PUBLIC_DOMAIN` is automatically detected for generating webhook URLs.

### Docker

```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
CMD ["bun", "run", "start"]
```

### Manual

```bash
bun install --production
NODE_ENV=production bun run start
```

## Security Considerations

- Passwords are hashed with Argon2 (via Bun's built-in `Bun.password`)
- GitHub webhook signatures use timing-safe comparison
- Sessions expire after 7 days
- Discord webhook URLs are redacted in API responses
- Each webhook mapping is scoped to its owner

## License

Github-Discord-Webhook-Bridge
Copyright (C) 2025 Alexander Ng

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see https://www.gnu.org/licenses/.
