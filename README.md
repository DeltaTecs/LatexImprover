# LaTeX Format Enhancer

LaTeX Format Enhancer is a small browser-based tool for applying focused formatting operations to LaTeX text. Paste text into the editor or upload a `.tex`, `.txt`, or `.latex` file, choose a formatter, and press **Apply**.

Changed result lines are highlighted with a green background, and the status message reports how many output lines changed.

## Features

- **Labeling**: adds managed inline labels to sections, subsections, theorem/lemma environments, and equation-like environments.
- **Equation Content Mark (%)**: wraps equation-like environments with percent marker lines.
- **Explicit Spacing**: normalizes spacing inside math content while preserving protected LaTeX fragments such as labels, refs, superscripts, subscripts, fractions, and square roots.
- **En-Dash Names**: converts compound names such as `Pauli-Fierz` to LaTeX en-dash style `Pauli--Fierz`.
- **Upload, copy, and download** support for working with local LaTeX files.

## Run Locally

This is a static site. For quick local use, open `index.html` in a browser.

The editor uses CodeMirror from a CDN when available. If those assets cannot load, the app falls back to a plain textarea without syntax or line highlighting.

## Run With Docker Compose

The included Docker Compose setup serves the static files through Nginx behind Caddy.

1. Copy the environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Edit `.env` if needed:

   - `SITE_ADDRESS`: use `localhost` for local use, or your domain for HTTPS.
   - `TLS_EMAIL`: optional but recommended for public HTTPS certificates.
   - `HTTP_PORT` / `HTTPS_PORT`: host ports exposed by Caddy.

3. Start the stack:

   ```powershell
   docker compose up -d
   ```

4. Open the app:

   - Local default: `http://localhost`
   - Custom port: `http://localhost:<HTTP_PORT>`
   - Public domain: `https://<SITE_ADDRESS>` after DNS points to the host

5. Stop the stack:

   ```powershell
   docker compose down
   ```

## Project Structure

- `index.html`: page markup and toolbar.
- `styles.css`: layout, editor, highlighting, help dialog, and completion animation styles.
- `script.js`: app wiring, formatter selection, upload/copy/download behavior.
- `js/formatters/`: formatter implementations.
- `js/highlighting.js`: changed-line diffing and CodeMirror line highlighting.
- `infra/nginx/default.conf`: Nginx static-site config.
- `infra/caddy/Caddyfile`: Caddy reverse proxy config.
- `docker-compose.yml`: Nginx + Caddy stack.

## Versioning

The displayed app version is defined in `js/config.js`. Increment `APP_VERSION` with each code update.
