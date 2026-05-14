import {
  BEGIN_ENV_PATTERN,
  EQUATION_ENV_NAMES,
  LEMMA_ENV_NAMES,
  MANAGED_LABEL_GLOBAL_PATTERN,
  MANAGED_LABEL_PATTERN,
  SECTION_PATTERN,
  SUBSECTION_PATTERN,
  THEOREM_ENV_NAMES,
  collectEnvironmentBlock,
  getIndent,
  removeInlineLabel,
  skipFollowingLabelOnlyLines,
} from "./shared.js";

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

function buildEquationLabelLines(indent, core) {
  return [`${indent}\\label{${core}}`];
}

export function relabelLatexWithChanges(latexCode) {
  const lines = latexCode.replace(/\r\n/g, "\n").split("\n");
  const output = [];
  const changedLineIndexes = [];
  let sectionIndex = 0;
  let subsectionIndex = 0;
  let theoremIndex = 0;
  let lemmaIndex = 0;
  let equationIndex = 0;
  let i = 0;

  function pushLine(line, changed = false) {
    output.push(line);
    if (changed) {
      changedLineIndexes.push(output.length - 1);
    }
  }

  while (i < lines.length) {
    const sourceLine = lines[i];
    const sectionMatch = SECTION_PATTERN.exec(sourceLine);
    const subsectionMatch = SUBSECTION_PATTERN.exec(sourceLine);
    const beginMatch = BEGIN_ENV_PATTERN.exec(sourceLine);

    if (sectionMatch) {
      const cleaned = removeInlineLabel(sourceLine);
      pushLine(cleaned, cleaned !== sourceLine);

      if (!sectionMatch[1]) {
        sectionIndex += 1;
        subsectionIndex = 0;
        theoremIndex = 0;
        lemmaIndex = 0;
        equationIndex = 0;
        const indent = getIndent(cleaned);
        const romanSection = toRoman(sectionIndex);
        pushLine(`${indent}\\label{sec-${romanSection}}`, true);
      }

      i = skipFollowingLabelOnlyLines(lines, i + 1);
      continue;
    }

    if (subsectionMatch) {
      const cleaned = removeInlineLabel(sourceLine);
      pushLine(cleaned, cleaned !== sourceLine);

      if (!subsectionMatch[1]) {
        subsectionIndex += 1;
        const indent = getIndent(cleaned);
        const romanSection = toRoman(sectionIndex || 1);
        pushLine(`${indent}\\label{subsec-${romanSection}.${subsectionIndex}}`, true);
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
        const startWasChanged = block.startLine !== lines[i];

        if (!isStarred) {
          theoremIndex += 1;
          const indent = getIndent(block.startLine);
          const romanSection = toRoman(sectionIndex || 1);
          labelLines.push(`${indent}\\label{thm-${romanSection}.${theoremIndex}}`);
        }

        pushLine(block.startLine, startWasChanged);
        for (const labelLine of labelLines) {
          pushLine(labelLine, true);
        }
        for (const innerLine of block.innerLines) {
          pushLine(innerLine);
        }
        if (block.hasEndLine) {
          pushLine(block.endLine);
        }
        i = skipFollowingLabelOnlyLines(lines, block.endIndex + 1);
        continue;
      }

      if (LEMMA_ENV_NAMES.has(bareEnvName)) {
        const block = collectEnvironmentBlock(lines, i, envName);
        const labelLines = [];
        const startWasChanged = block.startLine !== lines[i];

        if (!isStarred) {
          lemmaIndex += 1;
          const indent = getIndent(block.startLine);
          const romanSection = toRoman(sectionIndex || 1);
          labelLines.push(`${indent}\\label{lem-${romanSection}.${lemmaIndex}}`);
        }

        pushLine(block.startLine, startWasChanged);
        for (const labelLine of labelLines) {
          pushLine(labelLine, true);
        }
        for (const innerLine of block.innerLines) {
          pushLine(innerLine);
        }
        if (block.hasEndLine) {
          pushLine(block.endLine);
        }
        i = skipFollowingLabelOnlyLines(lines, block.endIndex + 1);
        continue;
      }

      if (EQUATION_ENV_NAMES.has(bareEnvName)) {
        const block = collectEnvironmentBlock(lines, i, envName);
        const labelLines = [];
        const startWasChanged = block.startLine !== lines[i];

        if (!isStarred) {
          equationIndex += 1;
          const indent = getIndent(block.startLine);
          const romanSection = toRoman(sectionIndex || 1);
          const core = `eq-${romanSection}.${equationIndex}`;
          labelLines.push(...buildEquationLabelLines(indent, core));
        }

        pushLine(block.startLine, startWasChanged);
        for (const labelLine of labelLines) {
          pushLine(labelLine, true);
        }
        for (const innerLine of block.innerLines) {
          pushLine(innerLine);
        }
        if (block.hasEndLine) {
          pushLine(block.endLine);
        }
        i = skipFollowingLabelOnlyLines(lines, block.endIndex + 1);
        continue;
      }
    }

    if (MANAGED_LABEL_PATTERN.test(sourceLine)) {
      const stripped = sourceLine
        .replace(MANAGED_LABEL_GLOBAL_PATTERN, "")
        .replace(/[ \t]+$/g, "");
      if (stripped.trim()) {
        pushLine(stripped, stripped !== sourceLine);
      }
      i += 1;
      continue;
    }

    pushLine(sourceLine);
    i += 1;
  }

  const text = `${output.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
  return {
    text,
    changedLineIndexes,
  };
}

export function relabelLatex(latexCode) {
  return relabelLatexWithChanges(latexCode).text;
}
