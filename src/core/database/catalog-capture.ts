import { Client } from "pg";
import fs from "fs";
import path from "path";

export type TargetClassification = "drizzle" | "legacy" | "hybrid" | "unknown";

export interface RedactedTargetIdentity {
  envVarName: string;
  isAvailable: boolean;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  normalizedIdentity?: string; // host:port/database
  connectedRole?: string;
  isSuperUser?: boolean;
  bypassesRls?: boolean;
  isRlsSafe?: boolean;
  roleAttributes?: Record<string, any>;
  errorMessage?: string;
}

export interface DrizzleJournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints?: boolean;
}

export interface DrizzleMigrationRecord {
  id: number;
  hash: string;
  created_at?: string | number;
}

export interface CatalogColumn {
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
}

export interface CatalogConstraint {
  constraintName: string;
  constraintType: string;
  tableName: string;
  columnName?: string;
  foreignTableName?: string;
  foreignColumnName?: string;
}

export interface CatalogIndex {
  indexName: string;
  tableName: string;
  indexDef: string;
}

export interface CatalogPolicy {
  tableName: string;
  policyName: string;
  cmd: string;
  roles: string[];
  qual: string | null;
  withCheck: string | null;
}

export interface TableRlsStatus {
  tableName: string;
  rowSecurity: boolean;
  forceRowSecurity: boolean;
}

export interface CatalogExtension {
  extName: string;
  extVersion: string;
}

export interface DatabaseCatalogSnapshot {
  targetIdentity: RedactedTargetIdentity;
  migrationTargetIdentity?: RedactedTargetIdentity;
  areTargetsIdentical?: boolean;
  classification: TargetClassification;
  classificationReason: string;
  drizzleMigrationRecords: DrizzleMigrationRecord[];
  canonicalJournalEntries: DrizzleJournalEntry[];
  lineageReconciled: boolean;
  legacyArtifactsDetected: boolean;
  legacyArtifactDetails: string[];
  tables: string[];
  tableRlsStatus: TableRlsStatus[];
  columns: CatalogColumn[];
  constraints: CatalogConstraint[];
  indexes: CatalogIndex[];
  policies: CatalogPolicy[];
  extensions: CatalogExtension[];
  unknownOrInconsistencyReasons: string[];
}

export interface ClientQueryable {
  query: (text: string, params?: any[]) => Promise<{ rows: any[] }>;
}

export interface CaptureOptions {
  databaseUrl?: string;
  migrationDatabaseUrl?: string;
  clientFactory?: (connectionString: string) => {
    connect: () => Promise<void>;
    query: (text: string, params?: any[]) => Promise<{ rows: any[] }>;
    end: () => Promise<void>;
  };
  journalPath?: string;
}

/**
 * Sanitize error messages and connection strings by redacting secrets and passwords.
 */
export function sanitizeCredentials(msg: string, secretUrl?: string): string {
  let sanitized = msg;
  if (secretUrl) {
    try {
      const parsed = new URL(secretUrl);
      if (parsed.password) {
        sanitized = sanitized.split(parsed.password).join("[REDACTED_PASSWORD]");
      }
    } catch {
      // Ignore URL parsing failure
    }
    sanitized = sanitized.split(secretUrl).join("[REDACTED_DATABASE_URL]");
  }
  sanitized = sanitized.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, (match) => {
    try {
      const parsed = new URL(match);
      if (parsed.password) {
        parsed.password = "REDACTED";
      }
      return parsed.toString();
    } catch {
      return "[REDACTED_DATABASE_URL]";
    }
  });
  sanitized = sanitized.replace(/:[^:@\s]+@/g, ":[REDACTED_PASSWORD]@");
  return sanitized;
}

/**
 * Parse connection string into non-sensitive identity metadata.
 */
export function parseRedactedTargetIdentity(
  envVarName: string,
  connectionString?: string
): RedactedTargetIdentity {
  if (!connectionString || !connectionString.trim()) {
    return {
      envVarName,
      isAvailable: false,
      errorMessage: `${envVarName} is not set or empty`,
    };
  }

  try {
    const url = new URL(connectionString);
    const host = url.hostname || "localhost";
    const port = url.port ? parseInt(url.port, 10) : 5432;
    const database = url.pathname ? url.pathname.replace(/^\//, "") : "postgres";
    const user = url.username || "unknown";

    return {
      envVarName,
      isAvailable: true,
      host,
      port,
      database,
      user,
      normalizedIdentity: `${host}:${port}/${database}`,
    };
  } catch (err: any) {
    return {
      envVarName,
      isAvailable: false,
      errorMessage: `Failed to parse ${envVarName}: ${sanitizeCredentials(err?.message || String(err), connectionString)}`,
    };
  }
}

/**
 * Read canonical Drizzle journal entries from metadata folder.
 */
export function readCanonicalJournal(journalPath?: string): DrizzleJournalEntry[] {
  const resolvedPath =
    journalPath ||
    path.resolve(process.cwd(), "database/drizzle/meta/_journal.json");

  if (!fs.existsSync(resolvedPath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(resolvedPath, "utf-8");
    const json = JSON.parse(raw);
    return json.entries || [];
  } catch {
    return [];
  }
}

/**
 * Execute catalog capture against database connection targets.
 */
export async function captureDatabaseCatalog(
  options: CaptureOptions = {}
): Promise<DatabaseCatalogSnapshot> {
  const databaseUrl = options.databaseUrl || process.env.DATABASE_URL;
  const migrationUrl = options.migrationDatabaseUrl || process.env.MIGRATION_DATABASE_URL;

  const targetIdentity = parseRedactedTargetIdentity("DATABASE_URL", databaseUrl);
  let migrationTargetIdentity: RedactedTargetIdentity | undefined;

  if (migrationUrl) {
    migrationTargetIdentity = parseRedactedTargetIdentity("MIGRATION_DATABASE_URL", migrationUrl);
  }

  const canonicalJournal = readCanonicalJournal(options.journalPath);
  const unknownReasons: string[] = [];

  if (!targetIdentity.isAvailable || !databaseUrl) {
    unknownReasons.push(`DATABASE_URL target unavailable: ${targetIdentity.errorMessage}`);
    return {
      targetIdentity,
      migrationTargetIdentity,
      areTargetsIdentical: migrationTargetIdentity
        ? targetIdentity.normalizedIdentity === migrationTargetIdentity.normalizedIdentity
        : true,
      classification: "unknown",
      classificationReason: "DATABASE_URL target is unavailable or invalid.",
      drizzleMigrationRecords: [],
      canonicalJournalEntries: canonicalJournal,
      lineageReconciled: false,
      legacyArtifactsDetected: false,
      legacyArtifactDetails: [],
      tables: [],
      tableRlsStatus: [],
      columns: [],
      constraints: [],
      indexes: [],
      policies: [],
      extensions: [],
      unknownOrInconsistencyReasons: unknownReasons,
    };
  }

  const defaultClientFactory = (connStr: string) => {
    const client = new Client({ connectionString: connStr, connectionTimeoutMillis: 5000 });
    return {
      connect: () => client.connect(),
      query: (text: string, params?: any[]) => client.query(text, params),
      end: () => client.end(),
    };
  };

  const clientFactory = options.clientFactory || defaultClientFactory;

  // 1. Probe DATABASE_URL Role & RLS Safety
  try {
    const dbClient = clientFactory(databaseUrl);
    await dbClient.connect();
    try {
      const roleRes = await dbClient.query(`
        SELECT
          current_user as connected_user,
          r.rolsuper,
          r.rolbypassrls,
          r.rolcreatedb,
          r.rolcreaterole,
          r.rolreplication
        FROM pg_roles r
        WHERE r.rolname = current_user
      `);

      if (roleRes.rows.length > 0) {
        const row = roleRes.rows[0];
        targetIdentity.connectedRole = row.connected_user;
        targetIdentity.isSuperUser = Boolean(row.rolsuper);
        targetIdentity.bypassesRls = Boolean(row.rolbypassrls);
        targetIdentity.isRlsSafe = !row.rolsuper && !row.rolbypassrls;
        targetIdentity.roleAttributes = {
          superUser: Boolean(row.rolsuper),
          bypassRls: Boolean(row.rolbypassrls),
          createDb: Boolean(row.rolcreatedb),
          createRole: Boolean(row.rolcreaterole),
          replication: Boolean(row.rolreplication),
        };
      }
    } finally {
      await dbClient.end();
    }
  } catch (err: any) {
    unknownReasons.push(
      `Failed connecting to DATABASE_URL: ${sanitizeCredentials(err?.message || String(err), databaseUrl)}`
    );
  }

  // 2. Probe MIGRATION_DATABASE_URL Role if distinct and available
  if (migrationTargetIdentity && migrationTargetIdentity.isAvailable && migrationUrl) {
    try {
      const migClient = clientFactory(migrationUrl);
      await migClient.connect();
      try {
        const roleRes = await migClient.query(`
          SELECT
            current_user as connected_user,
            r.rolsuper,
            r.rolbypassrls,
            r.rolcreatedb,
            r.rolcreaterole,
            r.rolreplication
          FROM pg_roles r
          WHERE r.rolname = current_user
        `);

        if (roleRes.rows.length > 0) {
          const row = roleRes.rows[0];
          migrationTargetIdentity.connectedRole = row.connected_user;
          migrationTargetIdentity.isSuperUser = Boolean(row.rolsuper);
          migrationTargetIdentity.bypassesRls = Boolean(row.rolbypassrls);
          migrationTargetIdentity.isRlsSafe = !row.rolsuper && !row.rolbypassrls;
          migrationTargetIdentity.roleAttributes = {
            superUser: Boolean(row.rolsuper),
            bypassRls: Boolean(row.rolbypassrls),
            createDb: Boolean(row.rolcreatedb),
            createRole: Boolean(row.rolcreaterole),
            replication: Boolean(row.rolreplication),
          };
        }
      } finally {
        await migClient.end();
      }
    } catch (err: any) {
      unknownReasons.push(
        `Failed connecting to MIGRATION_DATABASE_URL: ${sanitizeCredentials(err?.message || String(err), migrationUrl)}`
      );
    }
  }

  const areTargetsIdentical = migrationTargetIdentity
    ? targetIdentity.normalizedIdentity === migrationTargetIdentity.normalizedIdentity
    : true;

  if (targetIdentity.isRlsSafe === false) {
    unknownReasons.push(
      `Runtime DATABASE_URL role '${targetIdentity.connectedRole}' has SUPERUSER or BYPASSRLS privileges, violating tenant isolation safety.`
    );
  }

  // 3. Perform Catalog Capture using DATABASE_URL (or migration URL if runtime fails)
  let tables: string[] = [];
  let tableRlsStatus: TableRlsStatus[] = [];
  let columns: CatalogColumn[] = [];
  let constraints: CatalogConstraint[] = [];
  let indexes: CatalogIndex[] = [];
  let policies: CatalogPolicy[] = [];
  let extensions: CatalogExtension[] = [];
  let drizzleRecords: DrizzleMigrationRecord[] = [];
  let legacyDetails: string[] = [];
  let legacyDetected = false;

  try {
    const client = clientFactory(databaseUrl);
    await client.connect();
    try {
      // a. Public Tables
      const tablesRes = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      tables = tablesRes.rows.map((r) => r.table_name);

      // b. RLS Status
      const rlsRes = await client.query(`
        SELECT
          c.relname as table_name,
          c.relrowsecurity as row_security,
          c.relforcerowsecurity as force_row_security
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
        ORDER BY c.relname
      `);
      tableRlsStatus = rlsRes.rows.map((r) => ({
        tableName: r.table_name,
        rowSecurity: Boolean(r.row_security),
        forceRowSecurity: Boolean(r.force_row_security),
      }));

      // c. Columns
      const colsRes = await client.query(`
        SELECT
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `);
      columns = colsRes.rows.map((r) => ({
        tableName: r.table_name,
        columnName: r.column_name,
        dataType: r.data_type,
        isNullable: r.is_nullable === "YES",
        columnDefault: r.column_default,
      }));

      // d. Constraints
      const constRes = await client.query(`
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name
      `);
      constraints = constRes.rows.map((r) => ({
        constraintName: r.constraint_name,
        constraintType: r.constraint_type,
        tableName: r.table_name,
        columnName: r.column_name,
        foreignTableName: r.foreign_table_name,
        foreignColumnName: r.foreign_column_name,
      }));

      // e. Indexes
      const idxRes = await client.query(`
        SELECT
          indexname as index_name,
          tablename as table_name,
          indexdef as index_def
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `);
      indexes = idxRes.rows.map((r) => ({
        indexName: r.index_name,
        tableName: r.table_name,
        indexDef: r.index_def,
      }));

      // f. Policies
      const polRes = await client.query(`
        SELECT
          tablename as table_name,
          policyname as policy_name,
          cmd,
          roles,
          qual,
          with_check
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
      `);
      policies = polRes.rows.map((r) => ({
        tableName: r.table_name,
        policyName: r.policy_name,
        cmd: r.cmd,
        roles: Array.isArray(r.roles) ? r.roles : [r.roles],
        qual: r.qual,
        withCheck: r.with_check,
      }));

      // g. Extensions
      const extRes = await client.query(`
        SELECT extname, extversion
        FROM pg_extension
        ORDER BY extname
      `);
      extensions = extRes.rows.map((r) => ({
        extName: r.extname,
        extVersion: r.extversion,
      }));

      // h. Drizzle Migration History (__drizzle_migrations)
      if (tables.includes("__drizzle_migrations")) {
        const drizRes = await client.query(`
          SELECT id, hash, created_at
          FROM public.__drizzle_migrations
          ORDER BY id ASC
        `);
        drizzleRecords = drizRes.rows.map((r) => ({
          id: Number(r.id),
          hash: String(r.hash),
          created_at: r.created_at,
        }));
      }

      // i. Legacy Migration System Detection
      const legacyTables = ["schema_migrations", "migrations", "knex_migrations", "typeorm_migrations", "flyway_schema_history"];
      for (const lt of legacyTables) {
        if (tables.includes(lt)) {
          legacyDetected = true;
          legacyDetails.push(`Legacy migration table '${lt}' present in public schema`);
        }
      }
    } finally {
      await client.end();
    }
  } catch (err: any) {
    unknownReasons.push(`Catalog query failure: ${sanitizeCredentials(err?.message || String(err), databaseUrl)}`);
  }

  // Check filesystem legacy migrations
  const legacySqlDir = path.resolve(process.cwd(), "database/migrations");
  if (fs.existsSync(legacySqlDir)) {
    const legacyFiles = fs.readdirSync(legacySqlDir).filter((f) => f.endsWith(".sql"));
    if (legacyFiles.length > 0 && !legacyDetected) {
      // Check if non-drizzle tables exist that match legacy SQL models
      const legacyTableNames = ["audit_records", "crawl_acquisition", "brand_intelligence"];
      const matched = tables.filter((t) => legacyTableNames.includes(t));
      if (matched.length > 0 && drizzleRecords.length === 0) {
        legacyDetected = true;
        legacyDetails.push(`Legacy tables (${matched.join(", ")}) present without Drizzle tracking`);
      }
    }
  }

  // 4. Lineage Reconciliation
  let lineageReconciled = false;
  if (drizzleRecords.length > 0 && canonicalJournal.length > 0) {
    if (drizzleRecords.length === canonicalJournal.length) {
      lineageReconciled = true;
    } else {
      unknownReasons.push(
        `Drizzle migration record count (${drizzleRecords.length}) does not match canonical journal entries count (${canonicalJournal.length}).`
      );
    }
  }

  // 5. Classification
  let classification: TargetClassification = "unknown";
  let classificationReason = "";

  if (tables.length === 0) {
    classification = "unknown";
    classificationReason = "Empty database (0 public tables). Empty databases are uninitialized and classified as 'unknown'.";
  } else if (lineageReconciled && !legacyDetected && drizzleRecords.length > 0) {
    classification = "drizzle";
    classificationReason = `Target matches canonical Drizzle journal lineage (${drizzleRecords.length} entries) with no legacy migration system artifacts.`;
  } else if (legacyDetected && drizzleRecords.length === 0) {
    classification = "legacy";
    classificationReason = `Target is governed by legacy migration system (${legacyDetails.join("; ")}) with no Drizzle migration history.`;
  } else if (legacyDetected && drizzleRecords.length > 0) {
    classification = "hybrid";
    classificationReason = `Both Drizzle migration records (${drizzleRecords.length}) and legacy migration artifacts (${legacyDetails.join("; ")}) are present.`;
  } else {
    classification = "unknown";
    classificationReason =
      unknownReasons.length > 0
        ? `Target state cannot be reconciled: ${unknownReasons.join(" | ")}`
        : "Database state does not safely correspond to a recognized migration model.";
  }

  return {
    targetIdentity,
    migrationTargetIdentity,
    areTargetsIdentical,
    classification,
    classificationReason,
    drizzleMigrationRecords: drizzleRecords,
    canonicalJournalEntries: canonicalJournal,
    lineageReconciled,
    legacyArtifactsDetected: legacyDetected,
    legacyArtifactDetails: legacyDetails,
    tables,
    tableRlsStatus,
    columns,
    constraints,
    indexes,
    policies,
    extensions,
    unknownOrInconsistencyReasons: unknownReasons,
  };
}
