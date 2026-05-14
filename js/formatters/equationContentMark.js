import {
  BEGIN_ENV_PATTERN,
  EQUATION_ENV_NAMES,
  findEnvironmentEnd,
  getIndent,
  isPercentMarkerLine,
} from "./shared.js";

export function markEquationContent(latexCode) {
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
