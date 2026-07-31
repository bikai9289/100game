import { readFile, writeFile } from 'node:fs/promises';

const dataFiles = [
  new URL('../src/data/answers-women.json', import.meta.url),
  new URL('../src/data/answers-men.json', import.meta.url),
];

const womenCategoryCorrections = new Map([
  ["D'arcy Wretzky", 'musicians'],
  ['Elizabeth Stokes', 'musicians'],
  ['Emma Richardson', 'musicians'],
  ['Radie Peat', 'musicians'],
  ['Romy Madley Croft', 'musicians'],
]);

function normalize(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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
    .map((answer) => ({
      ...answer,
      category: womenCategoryCorrections.get(answer.name) ?? answer.category,
      hint: womenCategoryCorrections.has(answer.name)
        ? 'Singer, musician, songwriter, or recording artist'
        : answer.hint,
    }));

  if (!corrected.some((answer) => normalize(answer.name) === 'marie curie')) {
    corrected.push({
      name: 'Marie Curie',
      aliases: ['curie'],
      category: 'scientists',
      hint: 'Physicist and chemist; two-time Nobel Prize winner',
    });
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
