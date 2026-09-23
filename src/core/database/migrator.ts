import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "path";
import { captureDatabaseCatalog, DatabaseCatalogSnapshot } from "./catalog-capture";

export { captureDatabaseCatalog } from "./catalog-capture";
export type {
  TargetClassification,
  RedactedTargetIdentity,
  DatabaseCatalogSnapshot,
  CatalogColumn,
  CatalogConstraint,
  CatalogIndex,
  CatalogPolicy,
  CatalogExtension,
  TableRlsStatus,
} from "./catalog-capture";

export async function runMigrations(databaseUrl?: string) {
  const connectionString = databaseUrl || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required to run migrations.");
  }

  // Acceptance criteria: No SQL repair or migration starts while classification is unknown
  const snapshot = await captureDatabaseCatalog({ databaseUrl: connectionString });
  if (snapshot.classification === "unknown") {
    throw new Error(
      `[Migration Runner] Migration blocked: database environment classification is 'unknown' (${snapshot.classificationReason}).`
    );
  }

  const pool = new Pool({
    connectionString,
    max: 1,
  });

  try {
    const db = drizzle(pool);
    const migrationsFolder = path.resolve(process.cwd(), "database/drizzle");
    console.log(`[Migration Runner] Executing Drizzle migrations from: ${migrationsFolder}`);

    // Store Drizzle migration metadata table in the 'public' schema to avoid CREATE SCHEMA permission issues on restricted roles
    await migrate(db, {
      migrationsFolder,
      migrationsTable: "__drizzle_migrations",
      migrationsSchema: "public",
    });

    console.log("[Migration Runner] All migrations applied successfully.");
  } finally {
    await pool.end();
  }
}

// Allow direct CLI execution
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Migration Runner] Migration failed:", err);
      process.exit(1);
    });
}
