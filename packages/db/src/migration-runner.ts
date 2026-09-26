import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export interface MigrationClient {
  query(sql: string): Promise<unknown>;
}

export async function runMigrations(client: MigrationClient, migrationsDirectory: string): Promise<readonly string[]> {
  const filenames = (await readdir(migrationsDirectory))
    .filter((filename) => /^\d+_[a-z0-9_]+\.sql$/.test(filename))
    .sort();

  for (const filename of filenames) {
    const sql = await readFile(join(migrationsDirectory, filename), "utf8");
    await client.query(sql);
  }

  return filenames;
}
