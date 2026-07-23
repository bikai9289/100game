import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  createWranglerDeployConfig,
  writeWranglerDeployConfig,
} from './write-wrangler-deploy-config';

const DATABASE_ID = '00000000-0000-4000-8000-000000000001';

const baseConfig = {
  name: 'name100challenge',
  main: './src/server.ts',
  d1_databases: [
    {
      binding: 'DB',
      database_name: 'name100challenge-db',
      migrations_dir: 'src/db/migrations',
    },
  ],
};

describe('createWranglerDeployConfig', () => {
  it('rejects a missing database ID', () => {
    assert.throws(
      () => createWranglerDeployConfig(baseConfig, undefined),
      /CLOUDFLARE_DATABASE_ID is required/
    );
  });

  it('rejects a malformed database ID', () => {
    assert.throws(
      () => createWranglerDeployConfig(baseConfig, 'not-a-uuid'),
      /CLOUDFLARE_DATABASE_ID must be a valid UUID/
    );
  });

  it('rejects a config without the DB binding', () => {
    assert.throws(
      () =>
        createWranglerDeployConfig(
          {
            ...baseConfig,
            d1_databases: [
              {
                binding: 'OTHER_DB',
                database_name: 'other-db',
              },
            ],
          },
          DATABASE_ID
        ),
      /D1 binding "DB" was not found in the Wrangler config/
    );
  });

  it('injects the database ID and preserves deployment paths', () => {
    const config = createWranglerDeployConfig(baseConfig, DATABASE_ID);

    assert.equal(config.name, 'name100challenge');
    assert.equal(config.main, './src/server.ts');
    assert.equal(config.d1_databases?.[0]?.database_id, DATABASE_ID);
    assert.equal(config.d1_databases?.[0]?.migrations_dir, 'src/db/migrations');
    assert.equal(baseConfig.d1_databases[0].database_id, undefined);
  });
});

describe('writeWranglerDeployConfig', () => {
  it('reads the compiled Wrangler config and preserves its entrypoint', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'wrangler-deploy-'));
    const sourcePath = path.join(directory, 'wrangler.json');
    const outputPath = path.join(directory, 'wrangler.deploy.json');
    writeFileSync(
      sourcePath,
      JSON.stringify({ ...baseConfig, main: 'index.js' }),
      'utf8'
    );

    writeWranglerDeployConfig({
      sourcePath,
      databaseId: DATABASE_ID,
      outputPath,
    });

    const written = JSON.parse(readFileSync(outputPath, 'utf8'));
    assert.equal(written.main, 'index.js');
  });

  it('writes the generated config to the requested path', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'wrangler-deploy-'));
    const outputPath = path.join(directory, 'wrangler.deploy.json');

    writeWranglerDeployConfig({
      config: baseConfig,
      databaseId: DATABASE_ID,
      outputPath,
    });

    const written = JSON.parse(readFileSync(outputPath, 'utf8'));
    assert.equal(written.d1_databases[0].database_id, DATABASE_ID);
    assert.equal(written.main, './src/server.ts');
    assert.equal(written.d1_databases[0].migrations_dir, 'src/db/migrations');
  });
});
