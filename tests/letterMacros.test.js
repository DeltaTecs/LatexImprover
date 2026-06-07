import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { applyLetterMacros } from "../js/formatters/letterMacros.js";

describe("applyLetterMacros — core braced conversions", () => {
  test("\\mathbb{R} -> \\bbR", () => {
    assert.equal(applyLetterMacros("\\mathbb{R}"), "\\bbR");
  });

  test("\\mathds{R} -> \\bbR", () => {
    assert.equal(applyLetterMacros("\\mathds{R}"), "\\bbR");
  });

  test("\\mathcal{A} -> \\cA", () => {
    assert.equal(applyLetterMacros("\\mathcal{A}"), "\\cA");
  });

  test("\\widehat{A} -> \\hA", () => {
    assert.equal(applyLetterMacros("\\widehat{A}"), "\\hA");
  });

  test("\\hat{a} -> \\ha", () => {
    assert.equal(applyLetterMacros("\\hat{a}"), "\\ha");
  });

  test("\\widetilde{R} -> \\tR", () => {
    assert.equal(applyLetterMacros("\\widetilde{R}"), "\\tR");
  });

  test("\\overline{A} -> \\bA", () => {
    assert.equal(applyLetterMacros("\\overline{A}"), "\\bA");
  });

  test("\\underline{a} -> \\ua", () => {
    assert.equal(applyLetterMacros("\\underline{a}"), "\\ua");
  });

  test("\\vec{0} -> \\vO", () => {
    assert.equal(applyLetterMacros("\\vec{0}"), "\\vO");
  });

  test("\\mathbf{x} -> \\boox", () => {
    assert.equal(applyLetterMacros("\\mathbf{x}"), "\\boox");
  });

  test("\\mathds{1} -> \\bbone", () => {
    assert.equal(applyLetterMacros("\\mathds{1}"), "\\bbone");
  });

  test("\\mathbb{1} -> \\bbone", () => {
    assert.equal(applyLetterMacros("\\mathbb{1}"), "\\bbone");
  });

  test("\\bar{n} -> \\bn", () => {
    assert.equal(applyLetterMacros("\\bar{n}"), "\\bn");
  });

  test("\\mathsf{h} -> \\sfh", () => {
    assert.equal(applyLetterMacros("\\mathsf{h}"), "\\sfh");
  });

  test("\\mathfrak{F} -> \\fF", () => {
    assert.equal(applyLetterMacros("\\mathfrak{F}"), "\\fF");
  });

  test("converts inside a larger expression", () => {
    assert.equal(
      applyLetterMacros("x \\in \\mathbb{R} \\setminus \\mathcal{A}"),
      "x \\in \\bbR \\setminus \\cA"
    );
  });

  test("converts trailing braced form followed by a letter", () => {
    assert.equal(applyLetterMacros("\\mathcal{R}X"), "\\cRX");
  });
});

describe("applyLetterMacros — unbraced single-letter form", () => {
  test("\\mathcal R -> \\cR", () => {
    assert.equal(applyLetterMacros("\\mathcal R"), "\\cR");
  });

  test("\\mathcal{ R } with inner whitespace -> \\cR", () => {
    assert.equal(applyLetterMacros("\\mathcal{ R }"), "\\cR");
  });

  test("boundary: \\mathcal Rest is left unchanged", () => {
    assert.equal(applyLetterMacros("\\mathcal Rest"), "\\mathcal Rest");
  });

  test("does not touch \\barwedge", () => {
    assert.equal(applyLetterMacros("\\barwedge"), "\\barwedge");
  });
});

describe("applyLetterMacros — letters without a shorthand", () => {
  test("\\mathcal{C} is left unchanged", () => {
    assert.equal(applyLetterMacros("\\mathcal{C}"), "\\mathcal{C}");
  });

  test("\\mathbb{I} is left unchanged", () => {
    assert.equal(applyLetterMacros("\\mathbb{I}"), "\\mathbb{I}");
  });
});

describe("applyLetterMacros — accent command discrimination", () => {
  test("\\hat{A} is NOT rewritten (only \\widehat{A} is)", () => {
    assert.equal(applyLetterMacros("\\hat{A}"), "\\hat{A}");
  });

  test("\\widehat{a} is NOT rewritten (only \\hat{a} is)", () => {
    assert.equal(applyLetterMacros("\\widehat{a}"), "\\widehat{a}");
  });

  test("\\tilde{r} -> \\tir", () => {
    assert.equal(applyLetterMacros("\\tilde{r}"), "\\tir");
  });

  test("\\tilde{t} -> \\tilt", () => {
    assert.equal(applyLetterMacros("\\tilde{t}"), "\\tilt");
  });
});

describe("applyLetterMacros — protected spans", () => {
  test("does not rewrite inside a % comment", () => {
    const input = "\\mathbb{R} % see \\mathbb{R} note";
    assert.equal(applyLetterMacros(input), "\\bbR % see \\mathbb{R} note");
  });

  test("does not corrupt a \\newcommand definition line", () => {
    const input = "\\newcommand{\\bA}{{\\overline A}}";
    assert.equal(applyLetterMacros(input), input);
  });

  test("does not rewrite inside verbatim", () => {
    const input = "\\begin{verbatim}\n\\mathbb{R}\n\\end{verbatim}";
    assert.equal(applyLetterMacros(input), input);
  });

  test("does not rewrite inside \\verb", () => {
    const input = "\\verb|\\mathcal{A}|";
    assert.equal(applyLetterMacros(input), input);
  });

  test("rewrites code outside but not inside a comment on the same flow", () => {
    const input = "\\mathcal{A}\n% \\mathcal{B}\n\\mathcal{D}";
    assert.equal(applyLetterMacros(input), "\\cA\n% \\mathcal{B}\n\\cD");
  });
});

describe("applyLetterMacros — edge cases", () => {
  test("preserves trailing newline", () => {
    assert.ok(applyLetterMacros("\\mathbb{R}\n").endsWith("\n"));
  });

  test("does not add a trailing newline when absent", () => {
    assert.ok(!applyLetterMacros("\\mathbb{R}").endsWith("\n"));
  });

  test("handles multiple occurrences on one line", () => {
    assert.equal(
      applyLetterMacros("\\mathcal{A} + \\mathcal{B} + \\mathcal{A}"),
      "\\cA + \\cB + \\cA"
    );
  });

  test("is idempotent", () => {
    const input = "\\mathbb{R} \\mathcal{A} \\widehat{A} \\overline{B}";
    const once = applyLetterMacros(input);
    assert.equal(applyLetterMacros(once), once);
  });

  test("leaves text with no convertible commands unchanged", () => {
    const input = "Just some plain text with $a + b = c$.";
    assert.equal(applyLetterMacros(input), input);
  });
});
