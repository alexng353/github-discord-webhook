# Deploy and Host Github to Discord Webhook Bridge on Railway

GitHub to Discord Webhook Bridge is a self-hosted service that forwards GitHub webhook events to Discord channels with beautifully formatted embeds. It supports multi-user, multi-repo configurations with secure HMAC-SHA256 webhook signature verification, making it easy to get real-time GitHub notifications in your Discord server.

## About Hosting Github to Discord Webhook Bridge

Deploying GitHub to Discord Webhook Bridge involves setting up a Bun-powered web server connected to a PostgreSQL database. The service receives incoming webhooks from GitHub, verifies their authenticity using cryptographic signatures, and forwards formatted embed messages to configured Discord webhook URLs. Railway simplifies this by automatically provisioning the database and detecting the public domain. The service supports flexible registration modes (open, closed, or invite-only), and migrations run automatically on startup—no manual database setup required.

## Common Use Cases

- **Team Development Notifications** - Get instant Discord notifications when pull requests are opened, closed, or merged across multiple repositories
- **Multi-Repo Monitoring** - Consolidate GitHub activity from many repositories into a single Discord channel for easier tracking
- **Secure Webhook Forwarding** - Route GitHub webhooks through a secure intermediary that verifies signatures before forwarding to Discord

## Dependencies for Github to Discord Webhook Bridge Hosting

- **Bun Runtime** - Modern JavaScript runtime that powers the server
- **PostgreSQL Database** - Stores users, sessions, webhook mappings, and invite codes

### Deployment Dependencies

- [Bun](https://bun.sh) - JavaScript runtime
- [PostgreSQL](https://www.postgresql.org/) - Relational database
- [Hono](https://hono.dev/) - Lightweight web framework
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM with auto-migrations

### Implementation Details

The service exposes a webhook receiver endpoint at `/webhook/github/:id` that GitHub calls when events occur. Each webhook mapping stores the Discord webhook URL and a secret for signature verification:

```typescript
// GitHub webhook signature verification
const signature = c.req.header("X-Hub-Signature-256");
const expectedSignature = `sha256=${crypto
  .createHmac("sha256", mapping.secret)
  .update(body)
  .digest("hex")}`;
```

Environment variables control the service behavior:

| Variable       | Required | Description                        |
| -------------- | -------- | ---------------------------------- |
| `DATABASE_URL` | ✅       | PostgreSQL connection string       |
| `PORT`         | ❌       | Server port (default: 3000)        |
| `REGISTRATION` | ❌       | `open`, `closed`, or `invite_only` |

## Why Deploy Github to Discord Webhook Bridge on Railway?

Railway is a singular platform to deploy your infrastructure stack. Railway will host your infrastructure so you don't have to deal with configuration, while allowing you to vertically and horizontally scale it.

By deploying Github to Discord Webhook Bridge on Railway, you are one step closer to supporting a complete full-stack application with minimal burden. Host your servers, databases, AI agents, and more on Railway.
