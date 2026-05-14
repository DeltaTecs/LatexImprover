const PROTECTED_COMMAND_PATTERN =
  /\\(?:label|ref|eqref|autoref|cref|Cref|cite|citet|citep|url|href)\*?(?:\[[^\]]*\])*\{[^{}]*\}/g;
const PROTECTED_TOKEN_PATTERN = /@@ENDASHNAMES(\d+)@@/g;
const NAME_PART_PATTERN = "[A-Z][A-Za-z]*[a-z][A-Za-z]*";
const COMPOUND_NAME_PATTERN = new RegExp(
  `\\b${NAME_PART_PATTERN}(?:-${NAME_PART_PATTERN})+\\b`,
  "g"
);

function protectCommandArguments(text) {
  const protectedParts = [];
  const protectedText = text.replace(PROTECTED_COMMAND_PATTERN, (match) => {
    const token = `@@ENDASHNAMES${protectedParts.length}@@`;
    protectedParts.push(match);
    return token;
  });

  return { protectedText, protectedParts };
}

function restoreCommandArguments(text, protectedParts) {
  return text.replace(PROTECTED_TOKEN_PATTERN, (_match, index) => {
    return protectedParts[Number(index)] ?? _match;
  });
}

export function applyEnDashNames(latexCode) {
  const { protectedText, protectedParts } = protectCommandArguments(latexCode);
  const formatted = protectedText.replace(COMPOUND_NAME_PATTERN, (compoundName) => {
    return compoundName.replace(/-/g, "--");
  });

  return restoreCommandArguments(formatted, protectedParts);
}
