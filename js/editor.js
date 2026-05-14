function buildFallbackEditor(editorHost) {
  const fallback = document.createElement("textarea");
  fallback.className = "editor-fallback";
  fallback.spellcheck = false;
  editorHost.appendChild(fallback);

  return {
    getValue: () => fallback.value,
    setValue: (value) => {
      fallback.value = value;
    },
    lineCount: () => fallback.value.replace(/\r\n/g, "\n").split("\n").length,
    addLineClass: () => null,
    removeLineClass: () => {},
  };
}

function hasCodeMirrorWithStexMode() {
  if (!window.CodeMirror) {
    return false;
  }

  const modes = window.CodeMirror.modes;
  return !!modes && !!modes.stex;
}

export function createEditor(editorHost) {
  if (!editorHost) {
    throw new Error("Editor host is missing.");
  }

  if (!hasCodeMirrorWithStexMode()) {
    return {
      instance: buildFallbackEditor(editorHost),
      supportsHighlighting: false,
      isFallback: true,
    };
  }

  return {
    instance: window.CodeMirror(editorHost, {
      value: "",
      mode: "stex",
      lineNumbers: true,
      lineWrapping: true,
      viewportMargin: Infinity,
    }),
    supportsHighlighting: true,
    isFallback: false,
  };
}
