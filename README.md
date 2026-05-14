# LatexImprover

Containerized web app that formats pasted LaTeX code in the browser.

## Run

```bash
docker compose up --build
```

Open: `http://localhost`

## Reverse Proxy (Caddy)

`docker-compose.yml` includes a Caddy reverse proxy in front of the web app.

- Caddy listens on ports `80` and `443`.
- App container (`latex-improver`) is internal-only.
- Routing is configured in [Caddyfile](./Caddyfile).

Set a deployment domain:

```bash
# Linux/macOS
export CADDY_DOMAIN=example.com
docker compose up --build -d
```

```powershell
# Windows PowerShell
$env:CADDY_DOMAIN="example.com"
docker compose up --build -d
```

## What It Does

- Paste LaTeX into the input area.
- Click **Format LaTeX**.
- The frontend JavaScript applies:
  - trailing whitespace removal
  - indentation for `\begin{...}` / `\end{...}` blocks
  - indentation for brace-heavy lines
  - blank-line normalization

No backend processing is required.
