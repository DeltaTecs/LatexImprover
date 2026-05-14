export function createEditor(editorHost) {
  if (!editorHost) {
    throw new Error("Editor host is missing.");
  }

  if (!window.CodeMirror) {
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

  return window.CodeMirror(editorHost, {
    value: "",
    mode: "stex",
    lineNumbers: true,
    lineWrapping: true,
    viewportMargin: Infinity,
  });
}
