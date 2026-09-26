import { Pool } from "pg";

import type { PostgresClient } from "./postgres-backend-repository.js";

export interface ClosablePostgresClient extends PostgresClient {
  close(): Promise<void>;
}

export function createPostgresPool(connectionString: string): ClosablePostgresClient {
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 10_000, max: 10 });
  return {
    async query(query: {
      text: string;
      values?: readonly unknown[];
    }): Promise<{ rows: Record<string, unknown>[] }> {
      const result = await pool.query(query.text, query.values ? [...query.values] : undefined);
      return { rows: result.rows };
    },
    close: () => pool.end(),
  };
}
