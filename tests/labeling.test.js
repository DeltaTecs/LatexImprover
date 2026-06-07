import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { relabelLatex } from "../js/formatters/labeling.js";

describe("relabelLatex — \\section", () => {
  test("labels first section as sec-I", () => {
    assert.equal(
      relabelLatex("\\section{Introduction}"),
      "\\section{Introduction} \\label{sec-I}\n"
    );
  });

  test("labels subsequent sections with incrementing Roman numerals", () => {
    const out = relabelLatex("\\section{A}\n\n\\section{B}");
    assert.ok(out.includes("\\section{A} \\label{sec-I}"), `got: ${out}`);
    assert.ok(out.includes("\\section{B} \\label{sec-II}"), `got: ${out}`);
  });

  test("starred section gets no label", () => {
    const out = relabelLatex("\\section*{Unnumbered}");
    assert.ok(!out.includes("\\label{"), `got: ${out}`);
  });

  test("replaces existing sec- label", () => {
    assert.equal(
      relabelLatex("\\section{Title} \\label{sec-IV}"),
      "\\section{Title} \\label{sec-I}\n"
    );
  });

  test("consumes standalone label-only line following section", () => {
    const out = relabelLatex("\\section{Title}\n\\label{sec-old}");
    assert.ok(!out.includes("\\label{sec-old}"), `got: ${out}`);
    assert.ok(out.includes("\\label{sec-I}"), `got: ${out}`);
  });
});

describe("relabelLatex — \\subsection", () => {
  test("labels first subsection as subsec-I.1", () => {
    const out = relabelLatex("\\section{A}\n\\subsection{First}");
    assert.ok(out.includes("\\subsection{First} \\label{subsec-I.1}"), `got: ${out}`);
  });

  test("labels second subsection as subsec-I.2", () => {
    const out = relabelLatex("\\section{A}\n\\subsection{First}\n\\subsection{Second}");
    assert.ok(out.includes("\\label{subsec-I.2}"), `got: ${out}`);
  });

  test("subsection counter resets in a new section", () => {
    const out = relabelLatex(
      "\\section{A}\n\\subsection{S1}\n\\section{B}\n\\subsection{S2}"
    );
    assert.ok(out.includes("\\label{subsec-I.1}"), `got: ${out}`);
    assert.ok(out.includes("\\label{subsec-II.1}"), `got: ${out}`);
  });

  test("starred subsection gets no label", () => {
    const out = relabelLatex("\\subsection*{Unnumbered}");
    assert.ok(!out.includes("\\label{"), `got: ${out}`);
  });
});

describe("relabelLatex — \\begin{equation}", () => {
  test("labels equation as eq-I.1", () => {
    const input = "\\begin{equation}\n  x = y\n\\end{equation}";
    assert.equal(
      relabelLatex(input),
      "\\begin{equation} \\label{eq-I.1}\n  x = y\n\\end{equation}\n"
    );
  });

  test("starred equation gets no label", () => {
    const out = relabelLatex("\\begin{equation*}\n  x = y\n\\end{equation*}");
    assert.ok(!out.includes("\\label{"), `got: ${out}`);
  });

  test("second equation gets eq-I.2", () => {
    const input =
      "\\begin{equation}\n  a = b\n\\end{equation}\n\\begin{equation}\n  x = y\n\\end{equation}";
    const out = relabelLatex(input);
    assert.ok(out.includes("\\label{eq-I.1}"), `got: ${out}`);
    assert.ok(out.includes("\\label{eq-I.2}"), `got: ${out}`);
  });

  test("replaces existing eq- label on begin line", () => {
    const input = "\\begin{equation} \\label{eq-I.9}\n  x = y\n\\end{equation}";
    const out = relabelLatex(input);
    assert.ok(out.includes("\\label{eq-I.1}"), `got: ${out}`);
    assert.ok(!out.includes("\\label{eq-I.9}"), `got: ${out}`);
  });

  test("consumes standalone label-only line following environment", () => {
    const input = "\\begin{equation}\n  x = y\n\\end{equation}\n\\label{eq-old}";
    const out = relabelLatex(input);
    assert.ok(!out.includes("\\label{eq-old}"), `got: ${out}`);
    assert.ok(out.includes("\\label{eq-I.1}"), `got: ${out}`);
  });
});

describe("relabelLatex — \\begin{align} (treated as equation environment)", () => {
  test("labels align as eq-I.1, same as equation", () => {
    const input = "\\begin{align}\n  x &= y\n\\end{align}";
    assert.equal(
      relabelLatex(input),
      "\\begin{align} \\label{eq-I.1}\n  x &= y\n\\end{align}\n"
    );
  });

  test("starred align gets no label", () => {
    const out = relabelLatex("\\begin{align*}\n  x &= y\n\\end{align*}");
    assert.ok(!out.includes("\\label{"), `got: ${out}`);
  });

  test("align increments the shared equation counter after equation", () => {
    const input =
      "\\begin{equation}\n  a = b\n\\end{equation}\n\\begin{align}\n  x &= y\n\\end{align}";
    const out = relabelLatex(input);
    assert.ok(out.includes("\\begin{equation} \\label{eq-I.1}"), `got: ${out}`);
    assert.ok(out.includes("\\begin{align} \\label{eq-I.2}"), `got: ${out}`);
  });

  test("equation increments the shared equation counter after align", () => {
    const input =
      "\\begin{align}\n  x &= y\n\\end{align}\n\\begin{equation}\n  a = b\n\\end{equation}";
    const out = relabelLatex(input);
    assert.ok(out.includes("\\begin{align} \\label{eq-I.1}"), `got: ${out}`);
    assert.ok(out.includes("\\begin{equation} \\label{eq-I.2}"), `got: ${out}`);
  });

  test("replaces existing eq- label on begin{align} line", () => {
    const input = "\\begin{align} \\label{eq-I.9}\n  x &= y\n\\end{align}";
    const out = relabelLatex(input);
    assert.ok(out.includes("\\label{eq-I.1}"), `got: ${out}`);
    assert.ok(!out.includes("\\label{eq-I.9}"), `got: ${out}`);
  });

  test("align equation counter resets in a new section", () => {
    const input =
      "\\section{A}\n\\begin{align}\n  x &= y\n\\end{align}\n\\section{B}\n\\begin{align}\n  a &= b\n\\end{align}";
    const out = relabelLatex(input);
    assert.ok(out.includes("\\label{eq-I.1}"), `got: ${out}`);
    assert.ok(out.includes("\\label{eq-II.1}"), `got: ${out}`);
  });
});

describe("relabelLatex — other equation environments", () => {
  test("gather is labeled as eq-I.1", () => {
    const out = relabelLatex("\\begin{gather}\n  x = y\n\\end{gather}");
    assert.ok(out.includes("\\begin{gather} \\label{eq-I.1}"), `got: ${out}`);
  });

  test("starred gather gets no label", () => {
    const out = relabelLatex("\\begin{gather*}\n  x = y\n\\end{gather*}");
    assert.ok(!out.includes("\\label{"), `got: ${out}`);
  });

  test("multline is labeled as eq-I.1", () => {
    const out = relabelLatex("\\begin{multline}\n  x = y\n\\end{multline}");
    assert.ok(out.includes("\\begin{multline} \\label{eq-I.1}"), `got: ${out}`);
  });

  test("alignat is labeled as eq-I.1", () => {
    const out = relabelLatex("\\begin{alignat}\n  x &= y\n\\end{alignat}");
    assert.ok(out.includes("\\begin{alignat} \\label{eq-I.1}"), `got: ${out}`);
  });

  test("flalign is labeled as eq-I.1", () => {
    const out = relabelLatex("\\begin{flalign}\n  x &= y\n\\end{flalign}");
    assert.ok(out.includes("\\begin{flalign} \\label{eq-I.1}"), `got: ${out}`);
  });
});

describe("relabelLatex — theorem and lemma environments", () => {
  test("labels theorem as thm-I.1", () => {
    const out = relabelLatex("\\begin{theorem}\n  Some statement.\n\\end{theorem}");
    assert.ok(out.includes("\\begin{theorem} \\label{thm-I.1}"), `got: ${out}`);
  });

  test("starred theorem gets no label", () => {
    const out = relabelLatex("\\begin{theorem*}\n  content\n\\end{theorem*}");
    assert.ok(!out.includes("\\label{"), `got: ${out}`);
  });

  test("labels lemma as lem-I.1", () => {
    const out = relabelLatex("\\begin{lemma}\n  Some lemma.\n\\end{lemma}");
    assert.ok(out.includes("\\begin{lemma} \\label{lem-I.1}"), `got: ${out}`);
  });

  test("theorem and lemma counters are independent", () => {
    const input =
      "\\begin{theorem}\n  A\n\\end{theorem}\n\\begin{lemma}\n  B\n\\end{lemma}\n\\begin{theorem}\n  C\n\\end{theorem}";
    const out = relabelLatex(input);
    assert.ok(out.includes("\\label{thm-I.1}"), `got: ${out}`);
    assert.ok(out.includes("\\label{lem-I.1}"), `got: ${out}`);
    assert.ok(out.includes("\\label{thm-I.2}"), `got: ${out}`);
  });
});

describe("relabelLatex — counter reset per section", () => {
  test("equation counter resets when a new section starts", () => {
    const input =
      "\\section{A}\n\\begin{equation}\n  a = b\n\\end{equation}\n\\section{B}\n\\begin{equation}\n  x = y\n\\end{equation}";
    const out = relabelLatex(input);
    assert.ok(out.includes("\\label{eq-I.1}"), `got: ${out}`);
    assert.ok(out.includes("\\label{eq-II.1}"), `got: ${out}`);
  });

  test("theorem counter resets when a new section starts", () => {
    const input =
      "\\section{A}\n\\begin{theorem}\n  content\n\\end{theorem}\n\\section{B}\n\\begin{theorem}\n  content\n\\end{theorem}";
    const out = relabelLatex(input);
    assert.ok(out.includes("\\label{thm-I.1}"), `got: ${out}`);
    assert.ok(out.includes("\\label{thm-II.1}"), `got: ${out}`);
  });
});

describe("relabelLatex — trailing newline handling", () => {
  test("output always ends with exactly one newline", () => {
    const out = relabelLatex("\\section{A}");
    assert.ok(out.endsWith("\n"), `missing trailing newline: ${JSON.stringify(out)}`);
    assert.ok(!out.endsWith("\n\n"), `double trailing newline: ${JSON.stringify(out)}`);
  });

  test("input with trailing newline produces correct output", () => {
    const input = "\\begin{equation}\n  x = y\n\\end{equation}\n";
    assert.equal(
      relabelLatex(input),
      "\\begin{equation} \\label{eq-I.1}\n  x = y\n\\end{equation}\n"
    );
  });
});
