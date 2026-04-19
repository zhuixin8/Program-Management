# Deployment Guide

This project is a full-stack Next.js license management system. It includes:

- Next.js App Router pages
- Route Handlers under `/api`
- Middleware for admin protection
- Prisma Client
- SQLite writes for projects, activation codes, audit logs, nonces, rate limits, and sessions

Because of that, deployment choices are not equivalent. A static host can show static pages, but it cannot run the admin backend or License API. A serverless host can run Next.js functions, but the current SQLite file is not a durable database in most serverless environments.

## Recommended Production Target

Use Docker on a VPS, NAS, home server, or any container platform with a persistent volume.

```bash
cp .env.docker.example .env
docker compose up -d --build
```

The SQLite database is stored in the Docker volume:

```text
activation_manager_data:/app/data
```

This mode supports the complete system:

- Public homepage
- API docs
- Admin login and dashboard
- Project management
- Activation code generation
- License API
- API signature verification
- API rate limiting
- SQLite persistence
- Audit logs and consumption logs

## Platform Matrix

| Platform | Current project status | Production notes |
| --- | --- | --- |
| Docker / VPS | Full support | Recommended for production |
| Vercel | Full support with Postgres | Use `vercel-build` and `DATABASE_URL` |
| Netlify | Full support with Postgres | Use `netlify-build` and `DATABASE_URL` |
| Cloudflare Pages | Static-only mode does not run this API backend | Use Workers plus database refactor for full-stack deployment |
| GitHub Pages | Static hosting only | Not suitable for this full-stack system |

## Vercel

Quick import:

```text
https://vercel.com/new/clone?repository-url=https://github.com/zhuixin8/Program-Management
```

Suggested settings:

```text
Framework Preset: Next.js
Install Command: npm ci
Build Command: npm run vercel-build
Node.js Version: 22.x
```

Required environment variables:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
JWT_SECRET=replace-with-a-long-random-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-a-strong-initial-admin-password
ALLOWED_IPS=*
LICENSE_API_RATE_LIMIT_MAX=120
LICENSE_API_RATE_LIMIT_WINDOW_SECONDS=60
```

This repository includes `vercel.json`, so Vercel uses:

```bash
npm run vercel-build
```

That script runs:

```text
prisma generate --schema prisma/schema.postgres.prisma
prisma db push --schema prisma/schema.postgres.prisma
tsx scripts/seed-cloud.ts
next build
```

The cloud schema uses Postgres through `DATABASE_URL`. The local SQLite schema remains available for Docker and development.

## Netlify

Quick import:

```text
https://app.netlify.com/start/deploy?repository=https://github.com/zhuixin8/Program-Management
```

Suggested settings:

```text
Framework: Next.js
Build command: npm run netlify-build
Publish directory: .next
Node.js version: 22
```

Required environment variables:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
JWT_SECRET=replace-with-a-long-random-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-a-strong-initial-admin-password
ALLOWED_IPS=*
LICENSE_API_RATE_LIMIT_MAX=120
LICENSE_API_RATE_LIMIT_WINDOW_SECONDS=60
```

This repository includes `netlify.toml`, so Netlify uses:

```bash
npm run netlify-build
```

That script uses the same Postgres schema and seed flow as Vercel. The local SQLite schema remains available for Docker and development.

## Cloudflare Pages

Cloudflare Pages is suitable for static Next.js sites. This project is not static because it needs:

- `/api/admin/*`
- `/api/license/*`
- `/api/verify`
- Prisma Client
- SQLite writes
- Middleware authentication

For a static preview, Cloudflare Pages can only host pages that do not depend on the backend. That is not the complete activation manager.

Do not point Cloudflare Pages at the current full-stack project and expect the License API or admin backend to work. A Pages deployment would require a separate static-export branch that removes API routes and database-backed pages, then outputs a static `out` directory.

For a full Cloudflare deployment, use Cloudflare Workers with the Next.js/OpenNext adapter and refactor storage away from local SQLite. Likely storage choices are D1, Hyperdrive plus external SQL, KV, or Durable Objects, depending on the final data model. This is a code change, not a configuration-only deploy.

## GitHub Pages

GitHub Pages hosts static files. It cannot run:

- Next.js API Route Handlers
- Prisma
- SQLite writes
- admin login sessions
- License API signing and rate limits

So GitHub Pages is only appropriate for a separate static marketing site or static documentation export. It is not appropriate for the full activation-code management system.

If you want a GitHub Pages-only site, create a separate static export that removes server routes and database-backed pages, then publish the generated `out` folder through GitHub Actions.

## What Must Change for Serverless Production

Vercel and Netlify now use `prisma/schema.postgres.prisma` and `DATABASE_URL`, so they can run the complete product with a managed Postgres database.

To run the complete product on Cloudflare Workers, migrate the runtime to Cloudflare-compatible storage:

1. Add a Cloudflare-compatible database such as D1 or an external SQL connection.
2. Replace Node-oriented runtime assumptions with Workers-compatible APIs.
3. Use platform environment variables for `DATABASE_URL`, `JWT_SECRET`, and admin IP rules.
4. Re-test License API signatures, nonce replay prevention, rate limits, admin login, and audit logs.

Docker with a persistent volume remains the simplest production path for self-hosting.

## Official References

- Vercel Next.js deployment: <https://vercel.com/docs/frameworks/nextjs>
- Vercel SQLite limitation: <https://vercel.com/guides/is-sqlite-supported-in-vercel>
- Netlify Next.js support: <https://docs.netlify.com/frameworks/next-js/overview/>
- Cloudflare Pages Next.js guide: <https://developers.cloudflare.com/pages/framework-guides/nextjs/>
- Cloudflare Workers Next.js guide: <https://developers.cloudflare.com/workers/frameworks/framework-guides/nextjs/>
- Next.js static exports: <https://nextjs.org/docs/app/building-your-application/deploying/static-exports>
- GitHub Pages documentation: <https://docs.github.com/en/pages>

## Minimum Production Checklist

- Replace `JWT_SECRET` with a long random value.
- Change the default admin password immediately.
- Set `ALLOWED_IPS` to your real admin source IP or VPN CIDR.
- Keep License API signing enabled by using project API secrets.
- Back up the SQLite database regularly if using Docker.
- Put HTTPS in front of the service.
