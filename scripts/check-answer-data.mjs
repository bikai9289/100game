import { readFile } from 'node:fs/promises';

import {
  isSafeAnswerAlias,
  normalizeAnswerText,
  requiredWomenAnswers,
} from './answer-data-policy.mjs';

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
  return normalizeAnswerText(value);
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

    for (const alias of answer.aliases) {
      if (!isSafeAnswerAlias(alias)) {
        problems.push(
          `ambiguous single-word alias '${alias}' on ${answer.name}`
        );
      }
    }
  }

  if (filename === 'answers-women.json') {
    for (const required of requiredWomenAnswers) {
      const canonical = normalize(required.name);
      if (!acceptedInputs.has(canonical)) {
        problems.push(`missing required answer: ${required.name}`);
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`${filename}:\n${problems.join('\n')}`);
  }
  console.log(`${filename}: ${answers.length} valid unique answers`);
}
