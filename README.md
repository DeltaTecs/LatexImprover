# LatexImprover

Containerized web app that formats pasted LaTeX code in the browser.

## Run

```bash
docker compose up --build
```

Open: `http://localhost:8080`

## What It Does

- Paste LaTeX into the input area.
- Click **Format LaTeX**.
- The frontend JavaScript applies:
  - trailing whitespace removal
  - indentation for `\begin{...}` / `\end{...}` blocks
  - indentation for brace-heavy lines
  - blank-line normalization

No backend processing is required.
