const inputField = document.getElementById("latexInput");
const outputField = document.getElementById("latexOutput");
const operationSelect = document.getElementById("operationSelect");
const statusMessage = document.getElementById("statusMessage");
const fileInput = document.getElementById("fileInput");
const uploadButton = document.getElementById("uploadButton");
const formatButton = document.getElementById("formatButton");
const copyButton = document.getElementById("copyButton");
const downloadButton = document.getElementById("downloadButton");

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

function splitUnescapedComment(text) {
  // A `%` starts a comment unless escaped (`\%`).
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "%" && text[i - 1] !== "\\") {
      return text.slice(0, i);
    }
  }
  return text;
}

function countRowBreakCommands(text) {
  let backslashRun = 0;
  let breaks = 0;

  // Count pairs of backslashes; odd trailing slashes are ignored.
  for (const char of text) {
    if (char === "\\") {
      backslashRun += 1;
      continue;
    }

    if (backslashRun > 0) {
      breaks += Math.floor(backslashRun / 2);
      backslashRun = 0;
    }
  }

  if (backslashRun > 0) {
    breaks += Math.floor(backslashRun / 2);
  }

  return breaks;
}

// Count logical rows in display math from LaTeX row breaks (`\\`), not source line wraps.
function countImportantEquationLines(lines) {
  let hasMathContent = false;
  let rowBreaks = 0;

  for (const rawLine of lines) {
    const noComment = splitUnescapedComment(removeInlineLabel(rawLine));
    if (noComment.trim()) {
      hasMathContent = true;
    }

    rowBreaks += countRowBreakCommands(noComment);
  }

  if (!hasMathContent) {
    return 1;
  }

  return Math.max(1, rowBreaks + 1);
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

// Emit one equation label, or indexed labels when there are multiple math rows.
function buildEquationLabelLines(indent, core, importantLineCount) {
  if (importantLineCount <= 1) {
    return [`${indent}\\label{${core}}`];
  }

  const labels = [];
  for (let labelCounter = 1; labelCounter <= importantLineCount; labelCounter += 1) {
    labels.push(`${indent}\\label{${core},${labelCounter}}`);
  }
  return labels;
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
          const importantLineCount = countImportantEquationLines(block.innerLines);
          labelLines.push(...buildEquationLabelLines(indent, core, importantLineCount));
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

formatButton.addEventListener("click", () => {
  const selected = operationSelect.value;

  // Single gateway for formatting operations.
  if (selected === "labeling") {
    outputField.value = relabelLatex(inputField.value);
    statusMessage.textContent = "Applied labeling operation.";
    return;
  }

  outputField.value = inputField.value;
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
    inputField.value = content;
    statusMessage.textContent = `Loaded file: ${file.name}`;
  } catch (_err) {
    statusMessage.textContent = "Could not read file.";
  } finally {
    fileInput.value = "";
  }
});

copyButton.addEventListener("click", async () => {
  if (!outputField.value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(outputField.value);
    copyButton.textContent = "Copied";
    setTimeout(() => {
      copyButton.textContent = "Copy Result";
    }, 1200);
  } catch (_err) {
    copyButton.textContent = "Copy Failed";
    setTimeout(() => {
      copyButton.textContent = "Copy Result";
    }, 1200);
  }
});

downloadButton.addEventListener("click", () => {
  const textToDownload = outputField.value || inputField.value;
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
