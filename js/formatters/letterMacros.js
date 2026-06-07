// Rewrites expanded font/accent commands into the shorthand macros defined in
// the document preamble, e.g. \mathbb{R} -> \bbR, \mathcal{A} -> \cA,
// \widehat{A} -> \hA. Every shorthand is defined to expand to exactly the text
// it replaces, so the compiled output is unchanged.
//
// Each rule lists the source command(s) and a `letter -> shorthand` table.
// Commands that share a table are grouped (e.g. \mathbb and \mathds). Letters
// without a defined shorthand are deliberately omitted and left untouched
// (notably \mathcal{C} and the missing blackboard letters I, J, L, O, S, X, Y).
const RULES = [
  {
    commands: ["mathcal"],
    letters: {
      A: "\\cA", B: "\\cB", D: "\\cD", E: "\\cE", F: "\\cF", G: "\\cG",
      H: "\\cH", I: "\\cI", J: "\\cJ", K: "\\cK", L: "\\cL", M: "\\cM",
      N: "\\cN", O: "\\cO", P: "\\cP", Q: "\\cQ", R: "\\cR", S: "\\cS",
      T: "\\cT", U: "\\cU", V: "\\cV", W: "\\cW", X: "\\cX", Y: "\\cY",
      Z: "\\cZ",
    },
  },
  {
    commands: ["mathbb", "mathds"],
    letters: {
      A: "\\bbA", B: "\\bbB", C: "\\bbC", D: "\\bbD", E: "\\bbE", F: "\\bbF",
      G: "\\bbG", H: "\\bbH", K: "\\bbK", M: "\\bbM", N: "\\bbN", P: "\\bbP",
      Q: "\\bbQ", R: "\\bbR", T: "\\bbT", U: "\\bbU", V: "\\bbV", W: "\\bbW",
      Z: "\\bbZ", 1: "\\bbone",
    },
  },
  {
    commands: ["mathbf"],
    letters: {
      A: "\\boA", B: "\\boB", E: "\\boE", R: "\\boR", x: "\\boox",
      y: "\\boy", k: "\\bok", 0: "\\bzero", 1: "\\bfone",
    },
  },
  {
    commands: ["mathrm"],
    letters: { C: "\\rmC", I: "\\rmI", R: "\\rmR", S: "\\rmS" },
  },
  {
    commands: ["mathfrak"],
    letters: { F: "\\fF", H: "\\fH", K: "\\fK", Q: "\\fQ", h: "\\fh", k: "\\fk" },
  },
  {
    commands: ["mathsf"],
    letters: {
      h: "\\sfh", j: "\\sfj", J: "\\sfJ", N: "\\sfN", R: "\\sfR",
      q: "\\sfq", r: "\\sfr", u: "\\sfu", v: "\\sfv",
    },
  },
  {
    commands: ["widehat"],
    letters: {
      A: "\\hA", E: "\\hE", F: "\\hF", H: "\\hH", M: "\\hM", N: "\\hN",
      R: "\\hR", T: "\\hT", V: "\\hV", W: "\\hW", X: "\\hX", Z: "\\hZ",
      v: "\\hv", w: "\\hw",
    },
  },
  {
    commands: ["hat"],
    letters: {
      a: "\\ha", b: "\\hb", c: "\\hc", d: "\\hd", f: "\\hf", g: "\\hg",
      h: "\\hh", k: "\\hk", r: "\\hr", z: "\\hz",
    },
  },
  {
    commands: ["widetilde"],
    letters: {
      A: "\\tA", B: "\\tB", D: "\\tD", E: "\\tE", F: "\\tF", H: "\\tH",
      M: "\\tM", Q: "\\tQ", R: "\\tR", T: "\\tT", V: "\\tV", W: "\\tW",
      v: "\\tv", w: "\\tw",
    },
  },
  {
    commands: ["tilde"],
    letters: {
      a: "\\ta", b: "\\tb", d: "\\td", f: "\\tf", g: "\\tg", k: "\\tk",
      m: "\\tm", n: "\\tn", p: "\\tp", q: "\\tq", r: "\\tir", t: "\\tilt",
      x: "\\tx", y: "\\ty", z: "\\tz",
    },
  },
  {
    commands: ["vec"],
    letters: {
      A: "\\vA", B: "\\vB", F: "\\vF", G: "\\vG", R: "\\vR", f: "\\vf",
      g: "\\vg", k: "\\vk", m: "\\vm", n: "\\vn", p: "\\vp", q: "\\vq",
      v: "\\vv", x: "\\vx", 0: "\\vO",
    },
  },
  {
    commands: ["overline"],
    letters: {
      A: "\\bA", B: "\\bB", C: "\\bC", D: "\\bD", L: "\\bL", H: "\\bH",
      P: "\\bP", R: "\\bR",
    },
  },
  {
    commands: ["bar"],
    letters: { n: "\\bn", z: "\\bz" },
  },
  {
    commands: ["underline"],
    letters: {
      A: "\\uA", B: "\\uB", C: "\\uC", D: "\\uD", P: "\\uP", R: "\\uR",
      W: "\\uW", Z: "\\uZ", a: "\\ua", g: "\\ug", h: "\\uh", k: "\\uk",
      w: "\\uw",
    },
  },
];

// Matches either the braced form `\cmd{X}` / `\cmd{ X }` or the unbraced
// single-token form `\cmd X`. The unbraced branch requires whitespace plus a
// trailing non-letter boundary so `\mathcal Rest` and `\barwedge` never match,
// while the braced branch still converts `\mathcal{R}X`.
function buildCommandPattern(command) {
  return new RegExp(
    `\\\\${command}(?:\\s*\\{\\s*([A-Za-z0-9])\\s*\\}|\\s+([A-Za-z0-9])(?![A-Za-z]))`,
    "g"
  );
}

const COMPILED_RULES = RULES.map((rule) => ({
  letters: rule.letters,
  patterns: rule.commands.map(buildCommandPattern),
}));

const PROTECTED_TOKEN_PATTERN = /@@LETTERMACROS(\d+)@@/g;

// Spans whose contents must never be rewritten. Definition lines are protected
// to avoid corrupting the preamble itself (rewriting the body of
// `\newcommand{\bA}{{\overline A}}` would otherwise create `{{\bA}}`).
const PROTECT_PATTERNS = [
  /\\begin\{(verbatim|lstlisting)\}[\s\S]*?\\end\{\1\}/g,
  /\\verb(\S)[\s\S]*?\1/g,
  /^[ \t]*\\(?:newcommand|renewcommand|providecommand|def|DeclareMathOperator)\b[^\n]*$/gm,
  /(?<!\\)%[^\n]*/g,
];

function protectSpans(text) {
  const protectedParts = [];
  let protectedText = text;

  for (const pattern of PROTECT_PATTERNS) {
    protectedText = protectedText.replace(pattern, (match) => {
      const token = `@@LETTERMACROS${protectedParts.length}@@`;
      protectedParts.push(match);
      return token;
    });
  }

  return { protectedText, protectedParts };
}

function restoreSpans(text, protectedParts) {
  return text.replace(PROTECTED_TOKEN_PATTERN, (_match, index) => {
    return protectedParts[Number(index)] ?? _match;
  });
}

export function applyLetterMacros(latexCode) {
  const { protectedText, protectedParts } = protectSpans(latexCode);

  let result = protectedText;
  for (const { letters, patterns } of COMPILED_RULES) {
    for (const pattern of patterns) {
      result = result.replace(pattern, (match, braced, unbraced) => {
        const letter = braced ?? unbraced;
        const shorthand = letters[letter];
        return shorthand !== undefined ? shorthand : match;
      });
    }
  }

  return restoreSpans(result, protectedParts);
}
