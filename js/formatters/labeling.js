import {
  BEGIN_ENV_PATTERN,
  EQUATION_ENV_NAMES,
  LEMMA_ENV_NAMES,
  MANAGED_LABEL_GLOBAL_PATTERN,
  MANAGED_LABEL_PATTERN,
  SECTION_PATTERN,
  SUBSECTION_PATTERN,
  THEOREM_ENV_NAMES,
  appendEnvironmentBlock,
  collectEnvironmentBlock,
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

function buildLabel(core) {
  return `\\label{${core}}`;
}

function splitUnescapedComment(line) {
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === "%" && line[i - 1] !== "\\") {
      return [line.slice(0, i), line.slice(i)];
    }
  }

  return [line, ""];
}

function appendInlineLabel(line, label) {
  if (!label) {
    return line;
  }

  const [content, comment] = splitUnescapedComment(line);
  const labeledContent = `${content.replace(/[ \t]+$/g, "")} ${label}`;
  if (!comment) {
    return labeledContent;
  }

  return `${labeledContent} ${comment}`;
}

function withStartLineLabel(block, label) {
  if (!label) {
    return block;
  }

  return {
    ...block,
    startLine: appendInlineLabel(block.startLine, label),
  };
}

export function relabelLatex(latexCode) {
  const lines = latexCode.replace(/\r\n/g, "\n").split("\n");
  const output = [];
  let sectionIndex = 0;
  let subsectionIndex = 0;
  let theoremIndex = 0;
  let lemmaIndex = 0;
  let equationIndex = 0;
  let i = 0;

  while (i < lines.length) {
    const sourceLine = lines[i];
    const sectionMatch = SECTION_PATTERN.exec(sourceLine);
    const subsectionMatch = SUBSECTION_PATTERN.exec(sourceLine);
    const beginMatch = BEGIN_ENV_PATTERN.exec(sourceLine);

    if (sectionMatch) {
      const cleaned = removeInlineLabel(sourceLine);
      let label = "";

      if (!sectionMatch[1]) {
        sectionIndex += 1;
        subsectionIndex = 0;
        theoremIndex = 0;
        lemmaIndex = 0;
        equationIndex = 0;
        const romanSection = toRoman(sectionIndex);
        label = buildLabel(`sec-${romanSection}`);
      }

      output.push(appendInlineLabel(cleaned, label));
      i = skipFollowingLabelOnlyLines(lines, i + 1);
      continue;
    }

    if (subsectionMatch) {
      const cleaned = removeInlineLabel(sourceLine);
      let label = "";

      if (!subsectionMatch[1]) {
        subsectionIndex += 1;
        const romanSection = toRoman(sectionIndex || 1);
        label = buildLabel(`subsec-${romanSection}.${subsectionIndex}`);
      }

      output.push(appendInlineLabel(cleaned, label));
      i = skipFollowingLabelOnlyLines(lines, i + 1);
      continue;
    }

    if (beginMatch) {
      const envName = beginMatch[1];
      const bareEnvName = envName.replace(/\*$/, "");
      const isStarred = envName.endsWith("*");

      if (THEOREM_ENV_NAMES.has(bareEnvName)) {
        const block = collectEnvironmentBlock(lines, i, envName);
        let label = "";

        if (!isStarred) {
          theoremIndex += 1;
          const romanSection = toRoman(sectionIndex || 1);
          label = buildLabel(`thm-${romanSection}.${theoremIndex}`);
        }

        appendEnvironmentBlock(output, withStartLineLabel(block, label));
        i = skipFollowingLabelOnlyLines(lines, block.endIndex + 1);
        continue;
      }

      if (LEMMA_ENV_NAMES.has(bareEnvName)) {
        const block = collectEnvironmentBlock(lines, i, envName);
        let label = "";

        if (!isStarred) {
          lemmaIndex += 1;
          const romanSection = toRoman(sectionIndex || 1);
          label = buildLabel(`lem-${romanSection}.${lemmaIndex}`);
        }

        appendEnvironmentBlock(output, withStartLineLabel(block, label));
        i = skipFollowingLabelOnlyLines(lines, block.endIndex + 1);
        continue;
      }

      if (EQUATION_ENV_NAMES.has(bareEnvName)) {
        const block = collectEnvironmentBlock(lines, i, envName);
        let label = "";

        if (!isStarred) {
          equationIndex += 1;
          const romanSection = toRoman(sectionIndex || 1);
          const core = `eq-${romanSection}.${equationIndex}`;
          label = buildLabel(core);
        }

        appendEnvironmentBlock(output, withStartLineLabel(block, label));
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
