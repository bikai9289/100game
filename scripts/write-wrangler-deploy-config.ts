import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface D1DatabaseConfig {
  binding: string;
  database_name: string;
  database_id?: string;
  migrations_dir?: string;
  [key: string]: unknown;
}

export interface WranglerDeployConfig {
  name?: string;
  main?: string;
  d1_databases?: D1DatabaseConfig[];
  [key: string]: unknown;
}

interface WriteWranglerDeployConfigOptions {
  config?: WranglerDeployConfig;
  databaseId?: string;
  outputPath?: string;
  sourcePath?: string;
}

const DATABASE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SOURCE_PATH = path.join(
  SCRIPT_DIRECTORY,
  '..',
  'dist',
  'server',
  'wrangler.json'
);
const DEFAULT_OUTPUT_PATH = path.join(
  SCRIPT_DIRECTORY,
  '..',
  'dist',
  'server',
  'wrangler.deploy.json'
);

export function createWranglerDeployConfig(
  config: WranglerDeployConfig,
  databaseId: string | undefined
): WranglerDeployConfig {
  if (!databaseId) {
    throw new Error('CLOUDFLARE_DATABASE_ID is required');
  }

  if (!DATABASE_ID_PATTERN.test(databaseId)) {
    throw new Error('CLOUDFLARE_DATABASE_ID must be a valid UUID');
  }

  const databaseIndex = config.d1_databases?.findIndex(
    (database) => database.binding === 'DB'
  );

  if (databaseIndex === undefined || databaseIndex < 0) {
    throw new Error('D1 binding "DB" was not found in the Wrangler config');
  }

  const databases = config.d1_databases?.map((database, index) =>
    index === databaseIndex
      ? { ...database, database_id: databaseId }
      : database
  );

  return {
    ...config,
    d1_databases: databases,
  };
}

export function writeWranglerDeployConfig(
  options: WriteWranglerDeployConfigOptions = {}
): void {
  const sourcePath = options.sourcePath ?? DEFAULT_SOURCE_PATH;
  const config =
    options.config ??
    (JSON.parse(readFileSync(sourcePath, 'utf8')) as WranglerDeployConfig);
  const databaseId = options.databaseId ?? process.env.CLOUDFLARE_DATABASE_ID;
  const outputPath = options.outputPath ?? DEFAULT_OUTPUT_PATH;
  const deployConfig = createWranglerDeployConfig(config, databaseId);

  writeFileSync(
    outputPath,
    `${JSON.stringify(deployConfig, null, 2)}\n`,
    'utf8'
  );
}

const scriptPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;

if (scriptPath === fileURLToPath(import.meta.url)) {
  try {
    writeWranglerDeployConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to create Wrangler deploy config: ${message}`);
    process.exitCode = 1;
  }
}
