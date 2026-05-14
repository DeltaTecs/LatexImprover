// Standalone `\label{...}` lines are skipped while consuming structures.
export const LABEL_ONLY_PATTERN = /^\s*\\label\{[^}]+\}\s*$/;
export const MANAGED_LABEL_PATTERN = /\\label\{(?:sec|subsec|thm|lem|eq)-[^}]+\}/;
export const MANAGED_LABEL_GLOBAL_PATTERN = /\s*\\label\{(?:sec|subsec|thm|lem|eq)-[^}]+\}/g;

export const SECTION_PATTERN = /^\s*\\section(\*?)\{/;
export const SUBSECTION_PATTERN = /^\s*\\subsection(\*?)\{/;
export const BEGIN_ENV_PATTERN = /^\s*\\begin\{([a-zA-Z*]+)\}/;

export const THEOREM_ENV_NAMES = new Set(["theorem", "thm"]);
export const LEMMA_ENV_NAMES = new Set(["lemma", "lem"]);
export const EQUATION_ENV_NAMES = new Set([
  "equation",
  "align",
  "gather",
  "multline",
  "eqnarray",
  "alignat",
  "flalign",
]);

export function getIndent(line) {
  return line.match(/^\s*/)?.[0] ?? "";
}

export function removeInlineLabel(line) {
  return line.replace(/\s*\\label\{[^}]+\}/g, "").replace(/[ \t]+$/g, "");
}

export function isPercentMarkerLine(line) {
  return typeof line === "string" && /^\s*%\s*$/.test(line);
}

export function findEnvironmentEnd(lines, startIndex, envName) {
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

export function skipFollowingLabelOnlyLines(lines, startIndex) {
  let index = startIndex;
  while (index < lines.length && LABEL_ONLY_PATTERN.test(lines[index])) {
    index += 1;
  }
  return index;
}

export function collectEnvironmentBlock(lines, startIndex, envName) {
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

export function appendEnvironmentBlock(output, block, labelLines = []) {
  output.push(block.startLine);
  output.push(...labelLines);
  output.push(...block.innerLines);
  if (block.hasEndLine) {
    output.push(block.endLine);
  }
}
