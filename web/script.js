const inputField = document.getElementById("latexInput");
const outputField = document.getElementById("latexOutput");
const formatButton = document.getElementById("formatButton");
const copyButton = document.getElementById("copyButton");

function countUnescapedBraces(text) {
  let delta = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if ((ch === "{" || ch === "}") && text[i - 1] !== "\\") {
      delta += ch === "{" ? 1 : -1;
    }
  }
  return delta;
}

function formatLatex(latexCode) {
  const lines = latexCode.replace(/\r\n/g, "\n").split("\n");
  const formatted = [];
  let indentLevel = 0;
  let blankLineStreak = 0;

  for (const rawLine of lines) {
    const trimmedRight = rawLine.replace(/[ \t]+$/g, "");
    const line = trimmedRight.trim();

    if (!line) {
      blankLineStreak += 1;
      if (blankLineStreak <= 1) {
        formatted.push("");
      }
      continue;
    }

    blankLineStreak = 0;
    const closesEnv = /^\\end\{/.test(line);
    const startsItem = /^\\item\b/.test(line);
    const startsCloseBrace = /^}/.test(line);

    if (closesEnv || startsCloseBrace) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const currentIndent = "  ".repeat(indentLevel);
    formatted.push(currentIndent + line);

    const opensEnv = /^\\begin\{/.test(line);
    const braceDelta = countUnescapedBraces(line);

    if (opensEnv) {
      indentLevel += 1;
    }

    if (braceDelta > 0 && !startsItem) {
      indentLevel += braceDelta;
    } else if (braceDelta < 0) {
      indentLevel = Math.max(0, indentLevel + braceDelta);
    }
  }

  return formatted.join("\n").trim() + "\n";
}

formatButton.addEventListener("click", () => {
  outputField.value = formatLatex(inputField.value);
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
