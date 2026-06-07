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

const inputEditorHost = document.getElementById("inputEditor");
const outputEditorHost = document.getElementById("outputEditor");
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

const chkEnDashNames = document.getElementById("chk-en-dash-names");
const chkEquationContentMark = document.getElementById("chk-equation-content-mark");
const chkEquationToAlign = document.getElementById("chk-equation-to-align");
const chkExplicitSpacing = document.getElementById("chk-explicit-spacing");
const chkLabeling = document.getElementById("chk-labeling");

if (versionLabel) {
  versionLabel.textContent = `Version ${APP_VERSION}`;
}

const inputEditorState = createEditor(inputEditorHost);
const outputEditorState = createEditor(outputEditorHost, { readOnly: true });

const inputEditor = inputEditorState.instance;
const outputEditor = outputEditorState.instance;

const outputHighlighter = outputEditorState.supportsHighlighting
  ? createLineHighlighter(outputEditor, CHANGED_LINE_CLASS)
  : { clear: () => {}, highlight: () => {} };

if (inputEditorState.isFallback) {
  statusMessage.textContent = "Offline editor mode: using plain text area (no syntax or line highlighting).";
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

chkEquationToAlign.addEventListener("change", () => {
  const enabled = chkEquationToAlign.checked;
  chkExplicitSpacing.disabled = !enabled;
  chkLabeling.disabled = !enabled;
  if (!enabled) {
    chkExplicitSpacing.checked = false;
    chkLabeling.checked = false;
  }
});

formatButton.addEventListener("click", () => {
  const useEquationToAlign = chkEquationToAlign.checked;
  const useExplicitSpacing = chkExplicitSpacing.checked && useEquationToAlign;
  const useLabeling = chkLabeling.checked && useEquationToAlign;
  const useEnDashNames = chkEnDashNames.checked;
  const useEquationContentMark = chkEquationContentMark.checked;

  if (!useEquationToAlign && !useExplicitSpacing && !useLabeling && !useEnDashNames && !useEquationContentMark) {
    statusMessage.textContent = "No formatters selected.";
    return;
  }

  const before = inputEditor.getValue();
  let result = before;
  const applied = [];

  if (useEquationToAlign) {
    result = convertEquationToAlign(result);
    applied.push("Equation to Align");
  }
  if (useLabeling) {
    result = relabelLatex(result);
    applied.push("Labeling");
  }
  if (useExplicitSpacing) {
    result = applyExplicitSpacing(result);
    applied.push("Explicit Spacing");
  }
  if (useEnDashNames) {
    result = applyEnDashNames(result);
    applied.push("En-Dash Names");
  }
  if (useEquationContentMark) {
    result = markEquationContent(result);
    applied.push("Explicit Content Mark");
  }

  const changedLineIndexes = getChangedResultLineIndexes(before, result);
  outputHighlighter.clear();
  outputEditor.setValue(result);
  outputHighlighter.highlight(changedLineIndexes);

  const formatterList = applied.join(", ");
  statusMessage.textContent =
    `Applied: ${formatterList}. ${formatChangedLineCount(changedLineIndexes.length)}`;

  signalAppliedChange(outputEditorHost);
  signalFormatComplete();
});

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
    outputHighlighter.clear();
    inputEditor.setValue(content);
    outputEditor.setValue("");
    statusMessage.textContent = `Loaded file: ${file.name}`;
  } catch (_err) {
    statusMessage.textContent = "Could not read file.";
  } finally {
    fileInput.value = "";
  }
});

copyButton.addEventListener("click", async () => {
  const text = outputEditor.getValue() || inputEditor.getValue();
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
  const textToDownload = outputEditor.getValue() || inputEditor.getValue();
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
