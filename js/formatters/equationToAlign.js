import { BEGIN_ENV_PATTERN, findEnvironmentEnd } from "./shared.js";

const OPEN_BRACKET_PATTERN = /^(\s*)\\\[(.*)$/;
const CLOSE_BRACKET_PATTERN = /^(.*?)\\\](.*)$/;

export function convertEquationToAlign(latexCode) {
  const normalized = latexCode.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const output = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const beginMatch = BEGIN_ENV_PATTERN.exec(line);
    if (beginMatch) {
      const envName = beginMatch[1];
      if (envName === "equation" || envName === "equation*") {
        const targetEnv = "align";
        const endIndex = findEnvironmentEnd(lines, i, envName);

        if (i === endIndex) {
          output.push(
            line
              .replace(`\\begin{${envName}}`, `\\begin{${targetEnv}}`)
              .replace(`\\end{${envName}}`, `\\end{${targetEnv}}`)
          );
        } else {
          output.push(line.replace(`\\begin{${envName}}`, `\\begin{${targetEnv}}`));
          for (let j = i + 1; j < endIndex; j++) {
            output.push(lines[j]);
          }
          output.push(lines[endIndex].replace(`\\end{${envName}}`, `\\end{${targetEnv}}`));
        }
        i = endIndex + 1;
        continue;
      }
    }

    const openMatch = OPEN_BRACKET_PATTERN.exec(line);
    if (openMatch) {
      const indent = openMatch[1];
      const afterOpen = openMatch[2];

      const sameLineClose = CLOSE_BRACKET_PATTERN.exec(afterOpen);
      if (sameLineClose) {
        const content = sameLineClose[1].trim();
        const trailing = sameLineClose[2].trim();
        output.push(`${indent}\\begin{align}`);
        if (content) output.push(`${indent}  ${content}`);
        output.push(trailing ? `${indent}\\end{align} ${trailing}` : `${indent}\\end{align}`);
        i += 1;
        continue;
      }

      const innerLines = [];
      if (afterOpen.trim()) {
        innerLines.push(`${indent}  ${afterOpen.trimEnd()}`);
      }

      let j = i + 1;
      let found = false;
      while (j < lines.length) {
        const scanLine = lines[j];
        const closeMatch = CLOSE_BRACKET_PATTERN.exec(scanLine);
        if (closeMatch) {
          const before = closeMatch[1];
          const trailing = closeMatch[2].trim();
          if (before.trim()) innerLines.push(before.trimEnd());
          output.push(`${indent}\\begin{align}`);
          output.push(...innerLines);
          output.push(trailing ? `${indent}\\end{align} ${trailing}` : `${indent}\\end{align}`);
          i = j + 1;
          found = true;
          break;
        }
        innerLines.push(scanLine);
        j += 1;
      }

      if (!found) {
        output.push(line);
        i += 1;
      }
      continue;
    }

    output.push(line);
    i += 1;
  }

  return output.join("\n");
}
