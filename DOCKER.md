# Docker Compose Setup

This project runs behind Caddy as reverse proxy:

- `web`: Nginx serving static files
- `caddy`: Reverse proxy + optional HTTPS certificates

## 1) Configure environment

Copy and edit `.env`:

```powershell
Copy-Item .env.example .env
```

Key values:

- `SITE_ADDRESS`
  - `localhost` for local use
  - your real domain (for example `latex.example.com`) for public HTTPS
- `TLS_EMAIL`
  - optional but recommended for public domains
- `HTTP_PORT` / `HTTPS_PORT`
  - host ports exposed by Caddy

## 2) Start the stack

```powershell
docker compose up -d
```

## 3) Access

- Local: `http://localhost` (or your configured `HTTP_PORT`)
- Domain: `https://<SITE_ADDRESS>` once DNS points to the host

## 4) Stop

```powershell
docker compose down
```
