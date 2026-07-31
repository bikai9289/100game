import { readFile } from 'node:fs/promises';

const allowedCategories = new Set([
  'actresses',
  'musicians',
  'athletes',
  'scientists',
  'politicians',
  'historical',
  'business',
  'activists',
  'other',
]);
const files = ['answers-women.json', 'answers-men.json'];

function normalize(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

for (const filename of files) {
  const file = new URL(`../src/data/${filename}`, import.meta.url);
  const answers = JSON.parse(await readFile(file, 'utf8'));
  const ids = new Set();
  const acceptedInputs = new Map();
  const problems = [];

  for (const answer of answers) {
    if (!answer.id || ids.has(answer.id)) {
      problems.push(`missing or duplicate id: ${answer.name}`);
    }
    ids.add(answer.id);
    if (!allowedCategories.has(answer.category)) {
      problems.push(`unsupported category for ${answer.name}`);
    }

    const localAliases = new Set();
    for (const value of [answer.name, ...answer.aliases]) {
      const normalized = normalize(value);
      if (localAliases.has(normalized)) {
        problems.push(`duplicate input '${normalized}' on ${answer.name}`);
      }
      localAliases.add(normalized);

      const owner = acceptedInputs.get(normalized);
      if (owner && owner !== answer.id) {
        problems.push(`shared input '${normalized}' on ${owner}/${answer.id}`);
      }
      acceptedInputs.set(normalized, answer.id);
    }
  }

  if (problems.length > 0) {
    throw new Error(`${filename}:\n${problems.join('\n')}`);
  }
  console.log(`${filename}: ${answers.length} valid unique answers`);
}
