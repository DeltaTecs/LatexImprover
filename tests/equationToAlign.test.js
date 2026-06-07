import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { convertEquationToAlign } from "../js/formatters/equationToAlign.js";

describe("convertEquationToAlign — \\begin{equation}", () => {
  test("converts to \\begin{align}", () => {
    const input = "\\begin{equation}\n  x = y\n\\end{equation}";
    assert.equal(
      convertEquationToAlign(input),
      "\\begin{align}\n  x = y\n\\end{align}"
    );
  });

  test("converts starred variant to \\begin{align}", () => {
    const input = "\\begin{equation*}\n  x = y\n\\end{equation*}";
    assert.equal(
      convertEquationToAlign(input),
      "\\begin{align}\n  x = y\n\\end{align}"
    );
  });

  test("one-line equation environment", () => {
    assert.equal(
      convertEquationToAlign("\\begin{equation} x = y \\end{equation}"),
      "\\begin{align} x = y \\end{align}"
    );
  });

  test("preserves \\label inside equation", () => {
    const input = "\\begin{equation}\n  x = y\n  \\label{eq:test}\n\\end{equation}";
    assert.equal(
      convertEquationToAlign(input),
      "\\begin{align}\n  x = y\n  \\label{eq:test}\n\\end{align}"
    );
  });

  test("preserves indentation on begin/end lines", () => {
    const input = "  \\begin{equation}\n    x = y\n  \\end{equation}";
    assert.equal(
      convertEquationToAlign(input),
      "  \\begin{align}\n    x = y\n  \\end{align}"
    );
  });

  test("leaves commented-out \\begin{equation} unchanged", () => {
    const input = "% \\begin{equation}\n% x = y\n% \\end{equation}";
    assert.equal(convertEquationToAlign(input), input);
  });

  test("does not touch other environments", () => {
    const input = "\\begin{gather}\n  x = y\n\\end{gather}";
    assert.equal(convertEquationToAlign(input), input);
  });

  test("multiple equation blocks in one document", () => {
    const input =
      "\\begin{equation}\n  a = b\n\\end{equation}\ntext\n\\begin{equation*}\n  c = d\n\\end{equation*}";
    assert.equal(
      convertEquationToAlign(input),
      "\\begin{align}\n  a = b\n\\end{align}\ntext\n\\begin{align}\n  c = d\n\\end{align}"
    );
  });
});

describe("convertEquationToAlign — \\[...\\]", () => {
  test("multi-line \\[...\\] becomes align", () => {
    const input = "\\[\n  x = y\n\\]";
    assert.equal(
      convertEquationToAlign(input),
      "\\begin{align}\n  x = y\n\\end{align}"
    );
  });

  test("preserves indentation", () => {
    const input = "  \\[\n    x = y\n  \\]";
    assert.equal(
      convertEquationToAlign(input),
      "  \\begin{align}\n    x = y\n  \\end{align}"
    );
  });

  test("same-line \\[ x \\] becomes align", () => {
    const input = "\\[ x = y \\]";
    assert.equal(
      convertEquationToAlign(input),
      "\\begin{align}\n  x = y\n\\end{align}"
    );
  });

  test("preserves trailing % comment on closing \\]", () => {
    const input = "\\[\n  x = y\n\\] % important";
    assert.equal(
      convertEquationToAlign(input),
      "\\begin{align}\n  x = y\n\\end{align} % important"
    );
  });

  test("leaves commented-out \\[ unchanged", () => {
    const input = "% \\[\n% x = y\n% \\]";
    assert.equal(convertEquationToAlign(input), input);
  });

  test("unclosed \\[ passes through safely", () => {
    const input = "text\n\\[\n  x = y";
    assert.equal(convertEquationToAlign(input), input);
  });
});

describe("convertEquationToAlign — trailing newline handling", () => {
  test("preserves trailing newline", () => {
    const input = "\\begin{equation}\n  x = y\n\\end{equation}\n";
    assert.equal(
      convertEquationToAlign(input),
      "\\begin{align}\n  x = y\n\\end{align}\n"
    );
  });

  test("does not add trailing newline when absent", () => {
    const input = "\\begin{equation}\n  x = y\n\\end{equation}";
    const result = convertEquationToAlign(input);
    assert.ok(!result.endsWith("\n"), `unexpected trailing newline: ${JSON.stringify(result)}`);
  });
});
