const EXPLICIT_SPACING_BLOCK_ENVS = "(align\\*?|equation\\*?|gather\\*?|multline\\*?|split|cases)";

function splitUnescapedComment(line) {
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === "%" && line[i - 1] !== "\\") {
      return [line.slice(0, i), line.slice(i)];
    }
  }
  return [line, ""];
}

function protectPattern(text, pattern, store) {
  return text.replace(pattern, (match) => {
    const token = `@@PROTECTED${store.length}@@`;
    store.push(match);
    return token;
  });
}

function protectMathParts(text) {
  const store = [];
  let out = text;

  out = protectPattern(out, /\\(?:label|ref|eqref|cite)\{[^{}]*\}/g, store);
  out = protectPattern(out, /_[A-Za-z0-9]/g, store);
  out = protectPattern(out, /\^[A-Za-z0-9]/g, store);
  out = protectPattern(out, /_\{[^{}]*\}/g, store);
  out = protectPattern(out, /\^\{[^{}]*\}/g, store);
  out = protectPattern(out, /\\frac\{[^{}]*\}\{[^{}]*\}/g, store);
  out = protectPattern(out, /\\sqrt(?:\[[^\]]*\])?\{[^{}]*\}/g, store);
  out = protectPattern(out, /\\newcommand\*?\{[^{}]*\}(?:\[[^\]]*\])?\{[^{}]*\}/g, store);

  return { out, store };
}

function restoreProtectedMathParts(text, store) {
  let restored = text;

  for (let pass = 0; pass <= store.length; pass += 1) {
    const next = restored.replace(/@@PROTECTED(\d+)@@/g, (_match, index) => {
      return store[Number(index)] ?? _match;
    });

    if (next === restored) {
      return restored;
    }

    restored = next;
  }

  return restored;
}

function formatMathExpressionSpacing(mathExpression, isDisplayMath) {
  const protectedParts = protectMathParts(mathExpression);
  let out = protectedParts.out;

  out = out.replace(/\s*(?::=|\\coloneqq)\s*/g, " \\ := \\ ");
  out = out.replace(/\s*\\(in|notin|subseteq|subset|supseteq|supset)(?![A-Za-z])\s*/g, " \\$1 ");
  out = out.replace(/\s*\\leq\s*/g, " \\ \\leq \\ ");
  out = out.replace(/\s*\\geq\s*/g, " \\ \\geq \\ ");
  out = out.replace(/&\s*=\s*/g, "& \\ = \\ ");
  out = out.replace(/\s*=\s*&/g, " \\ = \\ &");

  out = out.replace(/([0-9A-Za-z)\]}\|])\s*=\s*([0-9A-Za-z\\(\{\[\|])/g, "$1 \\ = \\ $2");
  out = out.replace(/([0-9A-Za-z)\]}\|])\s*<\s*([0-9A-Za-z\\(\{\[\|])/g, "$1 \\ < \\ $2");
  out = out.replace(/([0-9A-Za-z)\]}\|])\s*>\s*([0-9A-Za-z\\(\{\[\|])/g, "$1 \\ > \\ $2");
  out = out.replace(/([0-9A-Za-z)\]}\|])\s*\+\s*([0-9A-Za-z\\(\{\[\|])/g, "$1 \\ + \\ $2");
  out = out.replace(/([0-9A-Za-z)\]}\|])\s*-\s*([0-9A-Za-z\\(\{\[\|])/g, "$1 \\ - \\ $2");

  out = out.replace(/\s*\\cdot\s*/g, " \\cdot ");
  out = out.replace(/\s*\\oplus\s*/g, " \\oplus ");

  out = out.replace(/\\\{([^{}\n]*?)\\\}/g, (_m, inner) => {
    const colonIndex = inner.indexOf(":");
    const barIndex = inner.indexOf("|");
    let splitIndex = -1;
    let delimiter = "";

    if (colonIndex >= 0) {
      splitIndex = colonIndex;
      delimiter = ":";
    } else if (barIndex >= 0) {
      const prev = inner[barIndex - 1] ?? "";
      const next = inner[barIndex + 1] ?? "";
      if (prev !== "\\" && next !== "\\") {
        splitIndex = barIndex;
        delimiter = "|";
      }
    }

    if (splitIndex < 0) {
      return _m;
    }

    const left = inner.slice(0, splitIndex).trim();
    const right = inner.slice(splitIndex + 1).trim();
    if (!left || !right) {
      return _m;
    }

    if (delimiter === ":") {
      return `\\big\\{ ${left} \\; : \\ ${right} \\big\\}`;
    }
    return `\\big\\{ ${left} \\; \\big| \\ ${right} \\big\\}`;
  });

  if (isDisplayMath) {
    out = out.replace(/([^\s\\\d])\s*([.,])(\s*)$/g, (_m, left, punct, trailing) => {
      if (/\\,\s*$/.test(left)) {
        return `${left}${punct}${trailing}`;
      }
      return `${left} \\, ${punct}${trailing}`;
    });
  }

  out = out.replace(/[ \t]{2,}/g, " ");

  return restoreProtectedMathParts(out, protectedParts.store);
}

function formatMathChunkPreservingComments(chunk, isDisplayMath) {
  const lines = chunk.split("\n");
  const formattedLines = lines.map((line) => {
    const parts = splitUnescapedComment(line);
    const mathPart = formatMathExpressionSpacing(parts[0], isDisplayMath);
    return `${mathPart}${parts[1]}`;
  });
  return formattedLines.join("\n");
}

function replaceDisplayMathBlocks(text) {
  const blockPattern = new RegExp(
    `\\\\begin\\{${EXPLICIT_SPACING_BLOCK_ENVS}\\}([\\s\\S]*?)\\\\end\\{\\1\\}`,
    "g"
  );

  return text.replace(blockPattern, (_fullMatch, envName, inner) => {
    const formattedInner = formatMathChunkPreservingComments(inner, true);
    return `\\begin{${envName}}${formattedInner}\\end{${envName}}`;
  });
}

function protectFormattedDisplayBlocks(text) {
  const storedBlocks = [];
  const formatted = replaceDisplayMathBlocks(text);
  const blockPattern = new RegExp(
    `\\\\begin\\{${EXPLICIT_SPACING_BLOCK_ENVS}\\}([\\s\\S]*?)\\\\end\\{\\1\\}`,
    "g"
  );

  const protectedText = formatted.replace(blockPattern, (blockMatch) => {
    const token = `@@DISPLAY_BLOCK_${storedBlocks.length}@@`;
    storedBlocks.push(blockMatch);
    return token;
  });

  return { protectedText, storedBlocks };
}

function replaceInlineMath(text) {
  let out = text;
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner) => `\\(${formatMathChunkPreservingComments(inner, false)}\\)`);
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner) => `\\[${formatMathChunkPreservingComments(inner, true)}\\]`);

  let rebuilt = "";
  let i = 0;
  let inInlineDollar = false;
  let currentMath = "";

  while (i < out.length) {
    const char = out[i];
    const next = out[i + 1];
    const prev = out[i - 1];

    if (char === "$" && prev !== "\\" && next !== "$") {
      if (inInlineDollar) {
        rebuilt += `${formatMathChunkPreservingComments(currentMath, false)}$`;
        currentMath = "";
        inInlineDollar = false;
      } else {
        inInlineDollar = true;
        rebuilt += "$";
      }
      i += 1;
      continue;
    }

    if (inInlineDollar) {
      currentMath += char;
    } else {
      rebuilt += char;
    }

    i += 1;
  }

  if (inInlineDollar) {
    rebuilt += currentMath;
  }

  return rebuilt;
}

export function applyExplicitSpacing(latexCode) {
  const normalized = latexCode.replace(/\r\n/g, "\n");
  const protectedBlocks = protectFormattedDisplayBlocks(normalized);
  const inlineFormatted = replaceInlineMath(protectedBlocks.protectedText);
  return inlineFormatted.replace(/@@DISPLAY_BLOCK_(\d+)@@/g, (_m, index) => {
    return protectedBlocks.storedBlocks[Number(index)] ?? _m;
  });
}
