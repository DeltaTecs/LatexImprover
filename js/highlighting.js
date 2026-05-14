const MAX_EXACT_DIFF_CELLS = 2000000;

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

  // dp[i][j] = minimum number of "after" lines to highlight from suffixes.
  for (let j = m - 1; j >= 0; j -= 1) {
    dp[n][j] = dp[n][j + 1] + 1;
  }

  for (let i = n - 1; i >= 0; i -= 1) {
    dp[i][m] = 0;
    for (let j = m - 1; j >= 0; j -= 1) {
      if (beforeLines[i] === afterLines[j]) {
        dp[i][j] = dp[i + 1][j + 1];
      } else {
        const skipBefore = dp[i + 1][j];
        const markAfter = dp[i][j + 1] + 1;
        dp[i][j] = Math.min(skipBefore, markAfter);
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

    if (dp[i + 1][j] <= dp[i][j + 1] + 1) {
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

export function createLineHighlighter(editor, changedLineClass) {
  const highlightedLines = [];

  function clear() {
    while (highlightedLines.length > 0) {
      const lineHandle = highlightedLines.pop();
      editor.removeLineClass(lineHandle, "background", changedLineClass);
    }
  }

  function highlight(lineIndexes) {
    clear();

    for (const lineIndex of lineIndexes) {
      if (lineIndex < 0 || lineIndex >= editor.lineCount()) {
        continue;
      }
      const lineHandle = editor.addLineClass(lineIndex, "background", changedLineClass);
      highlightedLines.push(lineHandle);
    }
  }

  function highlightDiff(beforeText, afterText) {
    const changedIndexes = computeChangedNewLineIndexes(beforeText, afterText);
    highlight(changedIndexes);
  }

  return {
    clear,
    highlight,
    highlightDiff,
  };
}

export function signalAppliedChange(editorHost) {
  editorHost.classList.remove("applied-flash");
  // Force reflow so consecutive operations still re-trigger the flash.
  void editorHost.offsetWidth;
  editorHost.classList.add("applied-flash");
  setTimeout(() => {
    editorHost.classList.remove("applied-flash");
  }, 650);
}
