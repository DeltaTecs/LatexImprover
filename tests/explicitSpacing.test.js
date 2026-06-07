import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { applyExplicitSpacing } from "../js/formatters/explicitSpacing.js";

describe("applyExplicitSpacing — formats inside \\begin{align}", () => {
  test("spaces = operator", () => {
    assert.equal(
      applyExplicitSpacing("\\begin{align}\na=b\n\\end{align}"),
      "\\begin{align}\na \\ = \\ b\n\\end{align}"
    );
  });

  test("spaces = operator in align*", () => {
    assert.equal(
      applyExplicitSpacing("\\begin{align*}\na=b\n\\end{align*}"),
      "\\begin{align*}\na \\ = \\ b\n\\end{align*}"
    );
  });

  test("spaces \\leq", () => {
    assert.equal(
      applyExplicitSpacing("\\begin{align}\na\\leq b\n\\end{align}"),
      "\\begin{align}\na \\ \\leq \\ b\n\\end{align}"
    );
  });

  test("spaces \\geq", () => {
    assert.equal(
      applyExplicitSpacing("\\begin{align}\na\\geq b\n\\end{align}"),
      "\\begin{align}\na \\ \\geq \\ b\n\\end{align}"
    );
  });

  test("spaces + operator", () => {
    assert.equal(
      applyExplicitSpacing("\\begin{align}\na+b\n\\end{align}"),
      "\\begin{align}\na \\ + \\ b\n\\end{align}"
    );
  });

  test("spaces - operator", () => {
    assert.equal(
      applyExplicitSpacing("\\begin{align}\na-b\n\\end{align}"),
      "\\begin{align}\na \\ - \\ b\n\\end{align}"
    );
  });

  test("spaces &= alignment point", () => {
    assert.equal(
      applyExplicitSpacing("\\begin{align}\na &= b\n\\end{align}"),
      "\\begin{align}\na & \\ = \\ b\n\\end{align}"
    );
  });

  test("spaces \\in", () => {
    const result = applyExplicitSpacing("\\begin{align}\nx\\in S\n\\end{align}");
    assert.ok(result.includes("x \\in S"), `got: ${result}`);
  });

  test("spaces \\cdot", () => {
    const result = applyExplicitSpacing("\\begin{align}\na\\cdot b\n\\end{align}");
    assert.ok(result.includes("a \\cdot b"), `got: ${result}`);
  });

  test("preserves % comments inside align", () => {
    const result = applyExplicitSpacing("\\begin{align}\na=b % a comment\n\\end{align}");
    assert.ok(result.includes("% a comment"), `comment lost: ${result}`);
  });

  test("does not mangle \\label inside align", () => {
    const result = applyExplicitSpacing(
      "\\begin{align}\na=b\n\\label{eq:foo}\n\\end{align}"
    );
    assert.ok(result.includes("\\label{eq:foo}"), `label mangled: ${result}`);
  });

  test("does not mangle subscripts inside align", () => {
    const result = applyExplicitSpacing("\\begin{align}\na_{i}=b_{j}\n\\end{align}");
    assert.ok(result.includes("_{i}"), `subscript mangled: ${result}`);
    assert.ok(result.includes("_{j}"), `subscript mangled: ${result}`);
  });
});

describe("applyExplicitSpacing — does NOT format outside align", () => {
  test("\\begin{equation} left unchanged", () => {
    const input = "\\begin{equation}\na=b\n\\end{equation}";
    assert.equal(applyExplicitSpacing(input), input);
  });

  test("\\begin{equation*} left unchanged", () => {
    const input = "\\begin{equation*}\na=b\n\\end{equation*}";
    assert.equal(applyExplicitSpacing(input), input);
  });

  test("\\begin{gather} left unchanged", () => {
    const input = "\\begin{gather}\na=b\n\\end{gather}";
    assert.equal(applyExplicitSpacing(input), input);
  });

  test("\\[...\\] left unchanged", () => {
    const input = "\\[\na=b\n\\]";
    assert.equal(applyExplicitSpacing(input), input);
  });

  test("inline $...$ left unchanged", () => {
    const input = "some text $a=b$ more text";
    assert.equal(applyExplicitSpacing(input), input);
  });

  test("plain text left unchanged", () => {
    const input = "Let a=b be given.";
    assert.equal(applyExplicitSpacing(input), input);
  });
});

describe("applyExplicitSpacing — trailing newline handling", () => {
  test("preserves trailing newline", () => {
    const input = "\\begin{align}\na=b\n\\end{align}\n";
    assert.ok(applyExplicitSpacing(input).endsWith("\n"));
  });

  test("does not add trailing newline when absent", () => {
    const input = "\\begin{align}\na=b\n\\end{align}";
    assert.ok(!applyExplicitSpacing(input).endsWith("\n"));
  });
});
