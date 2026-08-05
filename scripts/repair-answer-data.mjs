import { readFile, writeFile } from 'node:fs/promises';

import {
  isSafeAnswerAlias,
  normalizeAnswerText,
  requiredWomenAnswers,
  womenCategoryCorrections,
} from './answer-data-policy.mjs';

const dataFiles = [
  new URL('../src/data/answers-women.json', import.meta.url),
  new URL('../src/data/answers-men.json', import.meta.url),
];

function normalize(value) {
  return normalizeAnswerText(value);
}

function toId(name) {
  return normalize(name).replaceAll(' ', '-');
}

function formatJson(value) {
  return `${JSON.stringify(value, null, 2).replace(
    /\[\n\s+("(?:(?:\\.)|[^"\\])*")\n\s+\]/g,
    '[$1]'
  )}\n`;
}

function applyWomenCorrections(answers) {
  const corrected = answers
    .filter((answer) => answer.name !== 'Patricia Era Bath')
    .map((answer) => {
      const category = womenCategoryCorrections.get(answer.name);
      if (!category) return answer;

      return {
        ...answer,
        category,
        hint:
          category === 'musicians'
            ? 'Singer, musician, songwriter, or recording artist'
            : 'Scientist, inventor, mathematician, engineer, or astronaut',
      };
    });

  for (const required of requiredWomenAnswers) {
    const index = corrected.findIndex(
      (answer) => normalize(answer.name) === normalize(required.name)
    );
    if (index === -1) {
      corrected.push(required);
      continue;
    }

    corrected[index] = {
      ...corrected[index],
      ...required,
      aliases: [...(corrected[index]?.aliases ?? []), ...required.aliases],
    };
  }

  return corrected;
}

function sanitizeAnswers(input) {
  const canonicalOwners = new Map();
  const deduped = [];

  for (const answer of input) {
    const canonical = normalize(answer.name);
    if (!canonical || canonicalOwners.has(canonical)) continue;

    const id = toId(answer.name);
    canonicalOwners.set(canonical, id);
    deduped.push({ ...answer, id });
  }

  const candidates = deduped.map((answer) => {
    const seen = new Set();
    const canonical = normalize(answer.name);
    const aliases = [];

    for (const alias of answer.aliases ?? []) {
      const normalized = normalize(alias);
      if (!normalized || normalized === canonical || seen.has(normalized)) {
        continue;
      }
      if (!isSafeAnswerAlias(alias)) continue;
      const canonicalOwner = canonicalOwners.get(normalized);
      if (canonicalOwner && canonicalOwner !== answer.id) continue;

      seen.add(normalized);
      aliases.push(alias.trim());
    }

    return { ...answer, aliases };
  });

  const aliasOwners = new Map();
  for (const answer of candidates) {
    for (const alias of answer.aliases) {
      const normalized = normalize(alias);
      const owners = aliasOwners.get(normalized) ?? new Set();
      owners.add(answer.id);
      aliasOwners.set(normalized, owners);
    }
  }

  return candidates.map(({ id, name, aliases, category, hint }) => ({
    id,
    name,
    aliases: aliases.filter(
      (alias) => aliasOwners.get(normalize(alias))?.size === 1
    ),
    category,
    ...(hint ? { hint } : {}),
  }));
}

for (const [index, file] of dataFiles.entries()) {
  const input = JSON.parse(await readFile(file, 'utf8'));
  const corrected = index === 0 ? applyWomenCorrections(input) : input;
  const output = sanitizeAnswers(corrected);
  await writeFile(file, formatJson(output));
  console.log(`Repaired ${output.length} answers in ${file.pathname}`);
}
