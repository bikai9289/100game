import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { writeWorkerSecretsFile } from './write-worker-secrets-file';

const workerSecrets = {
  TURNSTILE_SECRET_KEY: 'turnstile-secret',
  GAME_SESSION_SECRET: 'session-secret',
  GAME_IP_HASH_SALT: 'ip-salt',
};

describe('writeWorkerSecretsFile', () => {
  it('writes only the required Worker secrets', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'worker-secrets-'));
    const outputPath = path.join(directory, 'worker-secrets.json');

    writeWorkerSecretsFile({ environment: workerSecrets, outputPath });

    assert.deepEqual(
      JSON.parse(readFileSync(outputPath, 'utf8')),
      workerSecrets
    );
  });

  it('rejects missing secrets without exposing secret values', () => {
    assert.throws(
      () =>
        writeWorkerSecretsFile({
          environment: {
            ...workerSecrets,
            GAME_SESSION_SECRET: '',
          },
          outputPath: 'unused.json',
        }),
      /^Error: Missing required Worker secret: GAME_SESSION_SECRET$/
    );
  });

  it('uses owner-only permissions for the temporary file', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'worker-secrets-'));
    const outputPath = path.join(directory, 'worker-secrets.json');

    writeWorkerSecretsFile({ environment: workerSecrets, outputPath });

    if (process.platform !== 'win32') {
      assert.equal(statSync(outputPath).mode & 0o777, 0o600);
    }
  });
});
