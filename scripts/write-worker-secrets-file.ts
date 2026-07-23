import { chmodSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_WORKER_SECRETS = [
  'TURNSTILE_SECRET_KEY',
  'GAME_SESSION_SECRET',
  'GAME_IP_HASH_SALT',
] as const;

interface WriteWorkerSecretsFileOptions {
  environment?: Readonly<Record<string, string | undefined>>;
  outputPath: string;
}

export function writeWorkerSecretsFile({
  environment = process.env,
  outputPath,
}: WriteWorkerSecretsFileOptions): void {
  const missing = REQUIRED_WORKER_SECRETS.filter(
    (name) => !environment[name]?.trim()
  );

  if (missing.length > 0) {
    throw new Error(`Missing required Worker secret: ${missing.join(', ')}`);
  }

  const secrets = Object.fromEntries(
    REQUIRED_WORKER_SECRETS.map((name) => [name, environment[name]])
  );

  writeFileSync(outputPath, `${JSON.stringify(secrets)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  chmodSync(outputPath, 0o600);
}

const scriptPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;

if (scriptPath === fileURLToPath(import.meta.url)) {
  const outputPath = process.argv[2];

  if (!outputPath) {
    console.error('Worker secrets output path is required');
    process.exitCode = 1;
  } else {
    try {
      writeWorkerSecretsFile({ outputPath });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to create Worker secrets file: ${message}`);
      process.exitCode = 1;
    }
  }
}
