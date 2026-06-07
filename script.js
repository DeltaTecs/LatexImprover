import { APP_VERSION, CHANGED_LINE_CLASS } from "./js/config.js";
import { createEditor } from "./js/editor.js";
import {
  createLineHighlighter,
  getChangedResultLineIndexes,
  signalAppliedChange,
} from "./js/highlighting.js";
import { applyEnDashNames } from "./js/formatters/enDashNames.js";
import { applyExplicitSpacing } from "./js/formatters/explicitSpacing.js";
import { markEquationContent } from "./js/formatters/equationContentMark.js";
import { relabelLatex } from "./js/formatters/labeling.js";
import { convertEquationToAlign } from "./js/formatters/equationToAlign.js";

const editorHost = document.getElementById("latexEditor");
const operationSelect = document.getElementById("operationSelect");
const statusMessage = document.getElementById("statusMessage");
const versionLabel = document.getElementById("versionLabel");
const formatCompleteIndicator = document.getElementById("formatCompleteIndicator");
const fileInput = document.getElementById("fileInput");
const uploadButton = document.getElementById("uploadButton");
const formatButton = document.getElementById("formatButton");
const copyButton = document.getElementById("copyButton");
const downloadButton = document.getElementById("downloadButton");
const helpButton = document.getElementById("helpButton");
const helpDialog = document.getElementById("helpDialog");
const helpCloseButton = document.getElementById("helpCloseButton");

if (versionLabel) {
  versionLabel.textContent = `Version ${APP_VERSION}`;
}

const editorState = createEditor(editorHost);
const editor = editorState.instance;
const highlighter = editorState.supportsHighlighting
  ? createLineHighlighter(editor, CHANGED_LINE_CLASS)
  : { clear: () => {}, highlight: () => {}, highlightFormatResult: () => {} };

if (editorState.isFallback) {
  statusMessage.textContent = "Offline editor mode: using plain text area (no syntax or line highlighting).";
}

function getEditorValue() {
  return editor.getValue();
}

function setEditorValue(value) {
  editor.setValue(value);
}

function signalFormatComplete() {
  if (!formatCompleteIndicator) {
    return;
  }

  formatCompleteIndicator.classList.remove("is-visible");
  void formatCompleteIndicator.offsetWidth;
  formatCompleteIndicator.classList.add("is-visible");
}

function formatChangedLineCount(count) {
  return `${count} ${count === 1 ? "line" : "lines"} changed.`;
}

function applyEditorTransform(transformFn, successMessage) {
  const before = getEditorValue();
  const after = transformFn(before);
  const changedLineIndexes = getChangedResultLineIndexes(before, after);
  highlighter.clear();
  setEditorValue(after);
  highlighter.highlight(changedLineIndexes);
  statusMessage.textContent =
    `${successMessage} ${formatChangedLineCount(changedLineIndexes.length)}`;
  signalAppliedChange(editorHost);
  signalFormatComplete();
}

function closeHelpDialog() {
  if (!helpDialog) {
    return;
  }

  if (typeof helpDialog.close === "function") {
    helpDialog.close();
    return;
  }

  helpDialog.removeAttribute("open");
}

formatButton.addEventListener("click", () => {
  const selected = operationSelect.value;

  if (selected === "labeling") {
    applyEditorTransform(relabelLatex, "Labeling applied to the text.");
    return;
  }

  if (selected === "equation-content-mark") {
    applyEditorTransform(markEquationContent, "Equation content markers applied to the text.");
    return;
  }

  if (selected === "explicit-spacing") {
    applyEditorTransform(applyExplicitSpacing, "Explicit spacing applied inside math content.");
    return;
  }

  if (selected === "en-dash-names") {
    applyEditorTransform(applyEnDashNames, "En-dash name compounds applied to the text.");
    return;
  }

  if (selected === "equation-to-align") {
    applyEditorTransform(convertEquationToAlign, "Equation environments converted to align.");
    return;
  }

  highlighter.clear();
  statusMessage.textContent = "Selected formatting operation is not available.";
});

if (helpButton && helpDialog) {
  helpButton.addEventListener("click", () => {
    if (helpDialog.open) {
      return;
    }

    if (typeof helpDialog.showModal === "function") {
      helpDialog.showModal();
      return;
    }

    helpDialog.setAttribute("open", "");
  });
}

if (helpCloseButton && helpDialog) {
  helpCloseButton.addEventListener("click", () => {
    closeHelpDialog();
  });
}

if (helpDialog) {
  helpDialog.addEventListener("click", (event) => {
    if (event.target === helpDialog) {
      closeHelpDialog();
    }
  });
}

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
    highlighter.clear();
    setEditorValue(content);
    statusMessage.textContent = `Loaded file: ${file.name}`;
  } catch (_err) {
    statusMessage.textContent = "Could not read file.";
  } finally {
    fileInput.value = "";
  }
});

copyButton.addEventListener("click", async () => {
  const text = getEditorValue();
  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    copyButton.textContent = "Copied";
    setTimeout(() => {
      copyButton.textContent = "Copy";
    }, 1200);
  } catch (_err) {
    copyButton.textContent = "Copy Failed";
    setTimeout(() => {
      copyButton.textContent = "Copy";
    }, 1200);
  }
});

downloadButton.addEventListener("click", () => {
  const textToDownload = getEditorValue();
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
