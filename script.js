const inputField = document.getElementById("latexInput");
const outputField = document.getElementById("latexOutput");
const operationSelect = document.getElementById("operationSelect");
const statusMessage = document.getElementById("statusMessage");
const fileInput = document.getElementById("fileInput");
const uploadButton = document.getElementById("uploadButton");
const formatButton = document.getElementById("formatButton");
const copyButton = document.getElementById("copyButton");
const downloadButton = document.getElementById("downloadButton");

const LABEL_ONLY_PATTERN = /^\s*\\label\{[^}]+\}\s*$/;

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

function removeInlineLabel(line) {
  return line.replace(/\s*\\label\{[^}]+\}/g, "").replace(/[ \t]+$/g, "");
}

function splitUnescapedComment(text) {
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

function findEnvironmentEnd(lines, startIndex, envName) {
  const escapedEnv = envName.replace("*", "\\*");
  const endPattern = new RegExp(`^\\s*\\\\end\\{${escapedEnv}\\}`);
  const currentLine = lines[startIndex];

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
  const equationEnvs = new Set([
    "equation",
    "align",
    "gather",
    "multline",
    "eqnarray",
    "alignat",
    "flalign",
  ]);

  while (i < lines.length) {
    const sourceLine = lines[i];
    const sectionMatch = /^\s*\\section(\*?)\{/.exec(sourceLine);
    const subsectionMatch = /^\s*\\subsection(\*?)\{/.exec(sourceLine);
    const beginMatch = /^\s*\\begin\{([a-zA-Z*]+)\}/.exec(sourceLine);

    if (sectionMatch) {
      const cleaned = removeInlineLabel(sourceLine);
      output.push(cleaned);

      if (!sectionMatch[1]) {
        sectionIndex += 1;
        subsectionIndex = 0;
        theoremIndex = 0;
        lemmaIndex = 0;
        equationIndex = 0;
        const indent = cleaned.match(/^\s*/)?.[0] ?? "";
        const romanSection = toRoman(sectionIndex);
        output.push(`${indent}\\label{sec-${romanSection}}`);
      }

      i += 1;
      while (i < lines.length && LABEL_ONLY_PATTERN.test(lines[i])) {
        i += 1;
      }
      continue;
    }

    if (subsectionMatch) {
      const cleaned = removeInlineLabel(sourceLine);
      output.push(cleaned);

      if (!subsectionMatch[1]) {
        subsectionIndex += 1;
        const indent = cleaned.match(/^\s*/)?.[0] ?? "";
        const romanSection = toRoman(sectionIndex || 1);
        output.push(`${indent}\\label{subsec-${romanSection}.${subsectionIndex}}`);
      }

      i += 1;
      while (i < lines.length && LABEL_ONLY_PATTERN.test(lines[i])) {
        i += 1;
      }
      continue;
    }

    if (beginMatch) {
      const envName = beginMatch[1];
      const bareEnvName = envName.replace(/\*$/, "");
      const isStarred = envName.endsWith("*");

      if (bareEnvName === "theorem" || bareEnvName === "thm") {
        const endIndex = findEnvironmentEnd(lines, i, envName);
        const block = lines.slice(i, endIndex + 1).map((line) => removeInlineLabel(line));
        const startLine = block[0];
        const endLine = block[block.length - 1];
        const innerLines = block.slice(1, -1).filter((line) => !LABEL_ONLY_PATTERN.test(line));
        output.push(startLine);

        if (!isStarred) {
          theoremIndex += 1;
          const indent = startLine.match(/^\s*/)?.[0] ?? "";
          const romanSection = toRoman(sectionIndex || 1);
          output.push(`${indent}\\label{thm-${romanSection}.${theoremIndex}}`);
        }

        for (const innerLine of innerLines) {
          output.push(innerLine);
        }

        if (block.length > 1) {
          output.push(endLine);
        }

        i = endIndex + 1;
        while (i < lines.length && LABEL_ONLY_PATTERN.test(lines[i])) {
          i += 1;
        }
        continue;
      }

      if (bareEnvName === "lemma" || bareEnvName === "lem") {
        const endIndex = findEnvironmentEnd(lines, i, envName);
        const block = lines.slice(i, endIndex + 1).map((line) => removeInlineLabel(line));
        const startLine = block[0];
        const endLine = block[block.length - 1];
        const innerLines = block.slice(1, -1).filter((line) => !LABEL_ONLY_PATTERN.test(line));
        output.push(startLine);

        if (!isStarred) {
          lemmaIndex += 1;
          const indent = startLine.match(/^\s*/)?.[0] ?? "";
          const romanSection = toRoman(sectionIndex || 1);
          output.push(`${indent}\\label{lem-${romanSection}.${lemmaIndex}}`);
        }

        for (const innerLine of innerLines) {
          output.push(innerLine);
        }

        if (block.length > 1) {
          output.push(endLine);
        }

        i = endIndex + 1;
        while (i < lines.length && LABEL_ONLY_PATTERN.test(lines[i])) {
          i += 1;
        }
        continue;
      }

      if (equationEnvs.has(bareEnvName)) {
        const endIndex = findEnvironmentEnd(lines, i, envName);
        const block = lines.slice(i, endIndex + 1).map((line) => removeInlineLabel(line));
        const startLine = block[0];
        const endLine = block[block.length - 1];
        const innerLines = block.slice(1, -1).filter((line) => !LABEL_ONLY_PATTERN.test(line));
        output.push(startLine);

        if (!isStarred) {
          equationIndex += 1;
          const indent = startLine.match(/^\s*/)?.[0] ?? "";
          const romanSection = toRoman(sectionIndex || 1);
          const core = `eq-${romanSection}.${equationIndex}`;
          const importantLineCount = countImportantEquationLines(innerLines);

          if (importantLineCount > 1) {
            for (let labelCounter = 1; labelCounter <= importantLineCount; labelCounter += 1) {
              output.push(`${indent}\\label{${core},${labelCounter}}`);
            }
          } else {
            output.push(`${indent}\\label{${core}}`);
          }
        }

        for (const innerLine of innerLines) {
          output.push(innerLine);
        }

        if (block.length > 1) {
          output.push(endLine);
        }

        i = endIndex + 1;
        while (i < lines.length && LABEL_ONLY_PATTERN.test(lines[i])) {
          i += 1;
        }
        continue;
      }
    }

    if (/\\label\{(?:sec|subsec|thm|lem|eq)-[^}]+\}/.test(sourceLine)) {
      const stripped = sourceLine
        .replace(/\s*\\label\{(?:sec|subsec|thm|lem|eq)-[^}]+\}/g, "")
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

  if (selected === "labeling") {
    outputField.value = relabelLatex(inputField.value);
    statusMessage.textContent = "Applied labeling operation.";
    return;
  }

  outputField.value = inputField.value;
  statusMessage.textContent = "Math formatting is not implemented yet.";
});

uploadButton.addEventListener("click", () => {
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
