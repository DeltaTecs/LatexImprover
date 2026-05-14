const editorHost = document.getElementById("latexEditor");
const operationSelect = document.getElementById("operationSelect");
const statusMessage = document.getElementById("statusMessage");
const versionLabel = document.getElementById("versionLabel");
const fileInput = document.getElementById("fileInput");
const uploadButton = document.getElementById("uploadButton");
const formatButton = document.getElementById("formatButton");
const copyButton = document.getElementById("copyButton");
const downloadButton = document.getElementById("downloadButton");
// Increment this value with every code update.
const APP_VERSION = "1.3.0";
const MAX_EXACT_DIFF_CELLS = 2000000;
const CHANGED_LINE_CLASS = "cm-changed-line";

let editor = null;
const highlightedLines = [];

if (versionLabel) {
  versionLabel.textContent = `Version ${APP_VERSION}`;
}

function createEditor() {
  if (!editorHost) {
    throw new Error("Editor host is missing.");
  }

  if (!window.CodeMirror) {
    const fallback = document.createElement("textarea");
    fallback.className = "editor-fallback";
    fallback.spellcheck = false;
    editorHost.appendChild(fallback);
    editor = {
      getValue: () => fallback.value,
      setValue: (value) => {
        fallback.value = value;
      },
      lineCount: () => fallback.value.replace(/\r\n/g, "\n").split("\n").length,
      addLineClass: () => null,
      removeLineClass: () => {},
    };
    return;
  }

  editor = window.CodeMirror(editorHost, {
    value: "",
    mode: "stex",
    lineNumbers: true,
    lineWrapping: true,
    viewportMargin: Infinity,
  });
}

function getEditorValue() {
  return editor.getValue();
}

function setEditorValue(value) {
  editor.setValue(value);
}

function clearChangedLineHighlights() {
  while (highlightedLines.length > 0) {
    const lineHandle = highlightedLines.pop();
    editor.removeLineClass(lineHandle, "background", CHANGED_LINE_CLASS);
  }
}

function highlightChangedLines(lineIndexes) {
  clearChangedLineHighlights();

  for (const lineIndex of lineIndexes) {
    if (lineIndex < 0 || lineIndex >= editor.lineCount()) {
      continue;
    }
    const lineHandle = editor.addLineClass(lineIndex, "background", CHANGED_LINE_CLASS);
    highlightedLines.push(lineHandle);
  }
}

function buildCoarseChangedLines(beforeLines, afterLines) {
  let start = 0;
  let beforeEnd = beforeLines.length - 1;
  let afterEnd = afterLines.length - 1;

  while (
    start <= beforeEnd &&
    start <= afterEnd &&
    beforeLines[start] === afterLines[start]
  ) {
    start += 1;
  }

  while (
    beforeEnd >= start &&
    afterEnd >= start &&
    beforeLines[beforeEnd] === afterLines[afterEnd]
  ) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }

  const changed = [];
  for (let lineIndex = start; lineIndex <= afterEnd; lineIndex += 1) {
    changed.push(lineIndex);
  }

  return changed;
}

function buildExactChangedLines(beforeLines, afterLines) {
  const n = beforeLines.length;
  const m = afterLines.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      if (beforeLines[i] === afterLines[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const changed = [];
  let i = 0;
  let j = 0;

  while (i < n && j < m) {
    if (beforeLines[i] === afterLines[j]) {
      i += 1;
      j += 1;
      continue;
    }

    if (dp[i + 1][j] >= dp[i][j + 1]) {
      i += 1;
    } else {
      changed.push(j);
      j += 1;
    }
  }

  while (j < m) {
    changed.push(j);
    j += 1;
  }

  return changed;
}

function computeChangedNewLineIndexes(beforeText, afterText) {
  const beforeLines = beforeText.replace(/\r\n/g, "\n").split("\n");
  const afterLines = afterText.replace(/\r\n/g, "\n").split("\n");
  const cells = beforeLines.length * afterLines.length;

  if (cells > MAX_EXACT_DIFF_CELLS) {
    return buildCoarseChangedLines(beforeLines, afterLines);
  }

  return buildExactChangedLines(beforeLines, afterLines);
}

function applyEditorTransform(transformFn, successMessage) {
  const before = getEditorValue();
  const after = transformFn(before);
  setEditorValue(after);
  highlightChangedLines(computeChangedNewLineIndexes(before, after));
  statusMessage.textContent = successMessage;
  signalAppliedChange();
}

function signalAppliedChange() {
  editorHost.classList.remove("applied-flash");
  // Force reflow so consecutive operations still re-trigger the flash.
  void editorHost.offsetWidth;
  editorHost.classList.add("applied-flash");
  setTimeout(() => {
    editorHost.classList.remove("applied-flash");
  }, 650);
}

// Standalone `\label{...}` lines are skipped while consuming structures.
const LABEL_ONLY_PATTERN = /^\s*\\label\{[^}]+\}\s*$/;
// Labels managed by this tool are removed and regenerated.
const MANAGED_LABEL_PATTERN = /\\label\{(?:sec|subsec|thm|lem|eq)-[^}]+\}/;
const MANAGED_LABEL_GLOBAL_PATTERN = /\s*\\label\{(?:sec|subsec|thm|lem|eq)-[^}]+\}/g;

const SECTION_PATTERN = /^\s*\\section(\*?)\{/;
const SUBSECTION_PATTERN = /^\s*\\subsection(\*?)\{/;
const BEGIN_ENV_PATTERN = /^\s*\\begin\{([a-zA-Z*]+)\}/;

const THEOREM_ENV_NAMES = new Set(["theorem", "thm"]);
const LEMMA_ENV_NAMES = new Set(["lemma", "lem"]);
const EQUATION_ENV_NAMES = new Set([
  "equation",
  "align",
  "gather",
  "multline",
  "eqnarray",
  "alignat",
  "flalign",
]);

function toRoman(num) {
  const romanMap = [
    ["M", 1000],
    ["CM", 900],
    ["D", 500],
    ["CD", 400],
    ["C", 100],
    ["XC", 90],
    ["L", 50],
    ["XL", 40],
    ["X", 10],
    ["IX", 9],
    ["V", 5],
    ["IV", 4],
    ["I", 1],
  ];

  let value = Math.max(1, num);
  let out = "";

  for (const [token, points] of romanMap) {
    while (value >= points) {
      out += token;
      value -= points;
    }
  }

  return out;
}

// Preserve original indentation when inserting generated labels.
function getIndent(line) {
  return line.match(/^\s*/)?.[0] ?? "";
}

function removeInlineLabel(line) {
  return line.replace(/\s*\\label\{[^}]+\}/g, "").replace(/[ \t]+$/g, "");
}

function isPercentMarkerLine(line) {
  return typeof line === "string" && /^\s*%\s*$/.test(line);
}

function skipFollowingLabelOnlyLines(lines, startIndex) {
  let index = startIndex;
  while (index < lines.length && LABEL_ONLY_PATTERN.test(lines[index])) {
    index += 1;
  }
  return index;
}

function collectEnvironmentBlock(lines, startIndex, envName) {
  const endIndex = findEnvironmentEnd(lines, startIndex, envName);
  const block = lines.slice(startIndex, endIndex + 1).map((line) => removeInlineLabel(line));
  const startLine = block[0];
  const endLine = block[block.length - 1];
  const innerLines = block.slice(1, -1).filter((line) => !LABEL_ONLY_PATTERN.test(line));

  return {
    endIndex,
    startLine,
    endLine,
    innerLines,
    hasEndLine: block.length > 1,
  };
}

// Append a cleaned environment in one place so structure stays consistent.
function appendEnvironmentBlock(output, block, labelLines = []) {
  output.push(block.startLine);
  output.push(...labelLines);
  output.push(...block.innerLines);
  if (block.hasEndLine) {
    output.push(block.endLine);
  }
}

// Equations are always labeled once, regardless of internal row breaks.
function buildEquationLabelLines(indent, core) {
  return [`${indent}\\label{${core}}`];
}

function findEnvironmentEnd(lines, startIndex, envName) {
  const escapedEnv = envName.replace("*", "\\*");
  const endPattern = new RegExp(`^\\s*\\\\end\\{${escapedEnv}\\}`);
  const currentLine = lines[startIndex];

  // Handle one-line environments such as `\begin{equation}...\end{equation}`.
  if (new RegExp(`\\\\end\\{${escapedEnv}\\}`).test(currentLine)) {
    return startIndex;
  }

  let index = startIndex + 1;
  while (index < lines.length && !endPattern.test(lines[index])) {
    index += 1;
  }

  if (index >= lines.length) {
    return lines.length - 1;
  }

  return index;
}

function relabelLatex(latexCode) {
  const lines = latexCode.replace(/\r\n/g, "\n").split("\n");
  const output = [];
  let sectionIndex = 0;
  let subsectionIndex = 0;
  let theoremIndex = 0;
  let lemmaIndex = 0;
  let equationIndex = 0;
  let i = 0;

  // Single pass: clean existing managed labels and rebuild deterministic numbering.
  while (i < lines.length) {
    const sourceLine = lines[i];
    const sectionMatch = SECTION_PATTERN.exec(sourceLine);
    const subsectionMatch = SUBSECTION_PATTERN.exec(sourceLine);
    const beginMatch = BEGIN_ENV_PATTERN.exec(sourceLine);

    if (sectionMatch) {
      const cleaned = removeInlineLabel(sourceLine);
      output.push(cleaned);

      if (!sectionMatch[1]) {
        sectionIndex += 1;
        subsectionIndex = 0;
        theoremIndex = 0;
        lemmaIndex = 0;
        equationIndex = 0;
        const indent = getIndent(cleaned);
        const romanSection = toRoman(sectionIndex);
        output.push(`${indent}\\label{sec-${romanSection}}`);
      }

      i = skipFollowingLabelOnlyLines(lines, i + 1);
      continue;
    }

    if (subsectionMatch) {
      const cleaned = removeInlineLabel(sourceLine);
      output.push(cleaned);

      if (!subsectionMatch[1]) {
        subsectionIndex += 1;
        const indent = getIndent(cleaned);
        const romanSection = toRoman(sectionIndex || 1);
        output.push(`${indent}\\label{subsec-${romanSection}.${subsectionIndex}}`);
      }

      i = skipFollowingLabelOnlyLines(lines, i + 1);
      continue;
    }

    if (beginMatch) {
      const envName = beginMatch[1];
      const bareEnvName = envName.replace(/\*$/, "");
      const isStarred = envName.endsWith("*");

      if (THEOREM_ENV_NAMES.has(bareEnvName)) {
        const block = collectEnvironmentBlock(lines, i, envName);
        const labelLines = [];

        if (!isStarred) {
          theoremIndex += 1;
          const indent = getIndent(block.startLine);
          const romanSection = toRoman(sectionIndex || 1);
          labelLines.push(`${indent}\\label{thm-${romanSection}.${theoremIndex}}`);
        }

        appendEnvironmentBlock(output, block, labelLines);

        i = skipFollowingLabelOnlyLines(lines, block.endIndex + 1);
        continue;
      }

      if (LEMMA_ENV_NAMES.has(bareEnvName)) {
        const block = collectEnvironmentBlock(lines, i, envName);
        const labelLines = [];

        if (!isStarred) {
          lemmaIndex += 1;
          const indent = getIndent(block.startLine);
          const romanSection = toRoman(sectionIndex || 1);
          labelLines.push(`${indent}\\label{lem-${romanSection}.${lemmaIndex}}`);
        }

        appendEnvironmentBlock(output, block, labelLines);

        i = skipFollowingLabelOnlyLines(lines, block.endIndex + 1);
        continue;
      }

      if (EQUATION_ENV_NAMES.has(bareEnvName)) {
        const block = collectEnvironmentBlock(lines, i, envName);
        const labelLines = [];

        if (!isStarred) {
          equationIndex += 1;
          const indent = getIndent(block.startLine);
          const romanSection = toRoman(sectionIndex || 1);
          const core = `eq-${romanSection}.${equationIndex}`;
          labelLines.push(...buildEquationLabelLines(indent, core));
        }

        appendEnvironmentBlock(output, block, labelLines);

        i = skipFollowingLabelOnlyLines(lines, block.endIndex + 1);
        continue;
      }
    }

    if (MANAGED_LABEL_PATTERN.test(sourceLine)) {
      const stripped = sourceLine
        .replace(MANAGED_LABEL_GLOBAL_PATTERN, "")
        .replace(/[ \t]+$/g, "");
      if (stripped.trim()) {
        output.push(stripped);
      }
      i += 1;
      continue;
    }

    output.push(sourceLine);
    i += 1;
  }

  return `${output.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

function markEquationContent(latexCode) {
  const normalized = latexCode.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const output = [];
  const hadTrailingNewline = normalized.endsWith("\n");
  let i = 0;

  while (i < lines.length) {
    const sourceLine = lines[i];
    const beginMatch = BEGIN_ENV_PATTERN.exec(sourceLine);

    if (beginMatch) {
      const envName = beginMatch[1];
      const bareEnvName = envName.replace(/\*$/, "");

      if (EQUATION_ENV_NAMES.has(bareEnvName)) {
        const endIndex = findEnvironmentEnd(lines, i, envName);
        const markerLine = `${getIndent(sourceLine)}%`;

        if (!isPercentMarkerLine(output[output.length - 1])) {
          output.push(markerLine);
        }

        for (let lineIndex = i; lineIndex <= endIndex; lineIndex += 1) {
          output.push(lines[lineIndex]);
        }

        if (!isPercentMarkerLine(lines[endIndex + 1])) {
          output.push(markerLine);
        }

        i = endIndex + 1;
        continue;
      }
    }

    output.push(sourceLine);
    i += 1;
  }

  const out = output.join("\n");
  if (hadTrailingNewline) {
    return `${out}\n`;
  }
  return out;
}

createEditor();

formatButton.addEventListener("click", () => {
  const selected = operationSelect.value;

  // Single gateway for formatting operations.
  if (selected === "labeling") {
    applyEditorTransform(relabelLatex, "Labeling applied to the text.");
    return;
  }

  if (selected === "equation-content-mark") {
    applyEditorTransform(markEquationContent, "Equation content markers applied to the text.");
    return;
  }

  clearChangedLineHighlights();
  statusMessage.textContent = "Math formatting is not implemented yet.";
});

uploadButton.addEventListener("click", () => {
  // File loading stays decoupled from formatting logic.
  fileInput.click();
});

fileInput.addEventListener("change", async () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) {
    return;
  }

  try {
    const content = await file.text();
    setEditorValue(content);
    clearChangedLineHighlights();
    statusMessage.textContent = `Loaded file: ${file.name}`;
  } catch (_err) {
    statusMessage.textContent = "Could not read file.";
  } finally {
    fileInput.value = "";
  }
});

copyButton.addEventListener("click", async () => {
  const text = getEditorValue();
  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    copyButton.textContent = "Copied";
    setTimeout(() => {
      copyButton.textContent = "Copy";
    }, 1200);
  } catch (_err) {
    copyButton.textContent = "Copy Failed";
    setTimeout(() => {
      copyButton.textContent = "Copy";
    }, 1200);
  }
});

downloadButton.addEventListener("click", () => {
  const textToDownload = getEditorValue();
  if (!textToDownload.trim()) {
    statusMessage.textContent = "Nothing to download.";
    return;
  }

  const blob = new Blob([textToDownload], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "formatted-latex.tex";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  statusMessage.textContent = "Downloaded output file.";
});
