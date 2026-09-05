import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

// A file route sitting beside a directory of the same name becomes a layout
// route for those children. That is fine for a chrome-only layout, but a page
// that sets its own SEO metadata makes the children render the parent body and
// inherit its canonical URL, which silently de-indexes them.
function collectConflicts(dir: string, conflicts: string[]) {
  const entries = readdirSync(dir);
  const directories = new Set(
    entries.filter((entry) => statSync(join(dir, entry)).isDirectory())
  );

  for (const entry of entries) {
    if (!entry.endsWith('.tsx')) continue;
    const name = entry.slice(0, -'.tsx'.length);
    if (!directories.has(name)) continue;

    const path = join(dir, entry);
    if (readFileSync(path, 'utf8').includes('seo(')) {
      conflicts.push(path.replaceAll('\\', '/'));
    }
  }

  for (const directory of directories) {
    collectConflicts(join(dir, directory), conflicts);
  }
}

describe('route layout conflicts', () => {
  it('has no SEO page shadowing a same-named route directory', () => {
    const conflicts: string[] = [];
    collectConflicts('src/routes', conflicts);

    assert.deepEqual(
      conflicts,
      [],
      `Rename these to <name>/index.tsx: ${conflicts.join(', ')}`
    );
  });
});
