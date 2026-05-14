const MAX_EXACT_DIFF_CELLS = 2000000;

function splitLines(text) {
  return text.replace(/\r\n/g, "\n").split("\n");
}

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
  const beforeCount = beforeLines.length;
  const afterCount = afterLines.length;
  const highlightCost = (beforeCount + afterCount) * (beforeCount + afterCount + 1) + 1;
  const dp = Array.from({ length: beforeCount + 1 }, () => new Float64Array(afterCount + 1));

  for (let afterIndex = afterCount - 1; afterIndex >= 0; afterIndex -= 1) {
    dp[beforeCount][afterIndex] = dp[beforeCount][afterIndex + 1] + highlightCost;
  }

  for (let beforeIndex = beforeCount - 1; beforeIndex >= 0; beforeIndex -= 1) {
    dp[beforeIndex][afterCount] = 0;
    for (let afterIndex = afterCount - 1; afterIndex >= 0; afterIndex -= 1) {
      const skipRemovedBeforeLine = dp[beforeIndex + 1][afterIndex];
      const markResultLine = dp[beforeIndex][afterIndex + 1] + highlightCost;

      if (beforeLines[beforeIndex] === afterLines[afterIndex]) {
        const keepUnchangedLine =
          dp[beforeIndex + 1][afterIndex + 1] + Math.abs(beforeIndex - afterIndex);
        dp[beforeIndex][afterIndex] = Math.min(
          keepUnchangedLine,
          skipRemovedBeforeLine,
          markResultLine
        );
      } else {
        dp[beforeIndex][afterIndex] = Math.min(skipRemovedBeforeLine, markResultLine);
      }
    }
  }

  const changed = [];
  let beforeIndex = 0;
  let afterIndex = 0;

  while (beforeIndex < beforeCount && afterIndex < afterCount) {
    if (beforeLines[beforeIndex] === afterLines[afterIndex]) {
      const keepUnchangedLine =
        dp[beforeIndex + 1][afterIndex + 1] + Math.abs(beforeIndex - afterIndex);
      if (keepUnchangedLine <= dp[beforeIndex][afterIndex]) {
        beforeIndex += 1;
        afterIndex += 1;
        continue;
      }
    }

    const skipRemovedBeforeLine = dp[beforeIndex + 1][afterIndex];
    const markResultLine = dp[beforeIndex][afterIndex + 1] + highlightCost;
    if (markResultLine <= skipRemovedBeforeLine) {
      changed.push(afterIndex);
      afterIndex += 1;
    } else {
      beforeIndex += 1;
    }
  }

  while (afterIndex < afterCount) {
    changed.push(afterIndex);
    afterIndex += 1;
  }

  return changed;
}

export function getChangedResultLineIndexes(beforeText, afterText) {
  const beforeLines = splitLines(beforeText);
  const afterLines = splitLines(afterText);
  let start = 0;
  const beforeLastIndex = beforeLines.length - 1;
  const afterLastIndex = afterLines.length - 1;

  while (
    start <= beforeLastIndex &&
    start <= afterLastIndex &&
    beforeLines[start] === afterLines[start]
  ) {
    start += 1;
  }

  const beforeRemainder = beforeLines.slice(start);
  const afterRemainder = afterLines.slice(start);
  const remainderCells = beforeRemainder.length * afterRemainder.length;

  if (remainderCells <= MAX_EXACT_DIFF_CELLS) {
    return buildExactChangedLines(beforeRemainder, afterRemainder).map(
      (lineIndex) => lineIndex + start
    );
  }

  let beforeEnd = beforeLastIndex;
  let afterEnd = afterLastIndex;

  while (
    beforeEnd >= start &&
    afterEnd >= start &&
    beforeLines[beforeEnd] === afterLines[afterEnd]
  ) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }

  if (afterEnd < start) {
    return [];
  }

  const beforeMiddle = beforeLines.slice(start, beforeEnd + 1);
  const afterMiddle = afterLines.slice(start, afterEnd + 1);
  const cells = beforeMiddle.length * afterMiddle.length;
  const changedMiddleLines = cells > MAX_EXACT_DIFF_CELLS
    ? buildCoarseChangedLines(beforeMiddle, afterMiddle)
    : buildExactChangedLines(beforeMiddle, afterMiddle);

  return changedMiddleLines.map((lineIndex) => lineIndex + start);
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

  function highlightFormatResult(beforeText, afterText) {
    highlight(getChangedResultLineIndexes(beforeText, afterText));
  }

  return {
    clear,
    highlight,
    highlightFormatResult,
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
