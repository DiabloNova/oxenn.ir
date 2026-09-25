import { TableDefinition } from "./types";

export const entitiesTable: TableDefinition = {
  tableName: "entities",
  columns: [
    {
      name: "id",
      type: "UUID",
      nullable: false,
      primaryKey: true,
      description: "Unique identifier for the semantic brand entity"
    },
    {
      name: "organization_id",
      type: "UUID",
      nullable: false,
      references: {
        table: "organizations",
        column: "id",
        onDelete: "CASCADE"
      },
      description: "Organization (tenant) partition key"
    },
    {
      name: "brand_id",
      type: "UUID",
      nullable: false,
      references: {
        table: "brands",
        column: "id",
        onDelete: "CASCADE"
      },
      description: "Brand associated with this semantic entity"
    },
    {
      name: "name",
      type: "TEXT",
      nullable: false,
      description: "Name of the entity (e.g. 'Apple Inc.')"
    },
    {
      name: "type",
      type: "TEXT",
      nullable: false,
      description: "Type of entity (e.g. Brand, Product, Person)"
    },
    {
      name: "wikidata_id",
      type: "TEXT",
      nullable: true,
      description: "Wikidata item identifier Q-code reference"
    },
    {
      name: "wikipedia_url",
      type: "TEXT",
      nullable: true,
      description: "Wikipedia page link"
    },
    {
      name: "aliases",
      type: "TEXT[]",
      nullable: true,
      description: "Alternative names or acronyms"
    },
    {
      name: "description",
      type: "TEXT",
      nullable: true,
      description: "A summary description of the semantic entity"
    },
    {
      name: "provenance",
      type: "JSONB",
      nullable: true,
      description: "Traceability source information and evidence context"
    },
    {
      name: "authority_score",
      type: "DOUBLE PRECISION",
      nullable: false,
      default: "0.0",
      description: "Calculated semantic domain authority score (0.0 to 100.0)"
    },
    {
      name: "completeness_score",
      type: "DOUBLE PRECISION",
      nullable: false,
      default: "0.0",
      description: "Calculated metadata profile completeness score (0.0 to 100.0)"
    },
    {
      name: "status",
      type: "TEXT",
      nullable: false,
      default: "'active'",
      description: "Operational state: active, archived, merged"
    },
    // Value Object: Confidence
    {
      name: "confidence_score",
      type: "DOUBLE PRECISION",
      nullable: false,
      default: "1.0",
      description: "Decimal score rating (0.0 to 1.0)"
    },
    {
      name: "confidence_rating",
      type: "TEXT",
      nullable: false,
      default: "'high'",
      description: "Categorical rating: high, medium, low"
    },
    // Audit & Lifecycle columns
    {
      name: "created_at",
      type: "TIMESTAMP",
      nullable: false,
      default: "NOW()",
      description: "Timestamp when the record was created"
    },
    {
      name: "updated_at",
      type: "TIMESTAMP",
      nullable: false,
      default: "NOW()",
      description: "Timestamp when the record was last updated"
    },
    {
      name: "created_by",
      type: "TEXT",
      nullable: false,
      default: "'system'",
      description: "User or service that created the record"
    },
    {
      name: "updated_by",
      type: "TEXT",
      nullable: false,
      default: "'system'",
      description: "User or service that last updated the record"
    },
    {
      name: "deleted_at",
      type: "TIMESTAMP",
      nullable: true,
      description: "Timestamp when soft-deletion occurred"
    },
    {
      name: "version",
      type: "INTEGER",
      nullable: false,
      default: "1",
      description: "Optimistic locking version counter"
    }
  ],
  indexes: [
    "CREATE INDEX idx_entities_organization ON entities(organization_id);",
    "CREATE INDEX idx_entities_brand ON entities(brand_id);",
    "CREATE UNIQUE INDEX idx_entities_org_id_id ON entities(organization_id, id);",
    "CREATE UNIQUE INDEX idx_entities_wikidata ON entities(wikidata_id) WHERE wikidata_id IS NOT NULL AND deleted_at IS NULL;"
  ],
  sql: `
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  wikidata_id TEXT,
  wikipedia_url TEXT,
  aliases TEXT[],
  description TEXT,
  provenance JSONB,
  authority_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  completeness_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'active',
  confidence_score DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  confidence_rating TEXT NOT NULL DEFAULT 'high',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'system',
  updated_by TEXT NOT NULL DEFAULT 'system',
  deleted_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT fk_entities_brand_composite FOREIGN KEY (organization_id, brand_id) REFERENCES brands(organization_id, id) ON DELETE CASCADE,
  CONSTRAINT chk_entities_scores_ranges CHECK (
    authority_score >= 0.0 AND authority_score <= 100.0 AND
    completeness_score >= 0.0 AND completeness_score <= 100.0 AND
    confidence_score >= 0.0 AND confidence_score <= 1.0 AND
    status IN ('active', 'archived', 'merged')
  )
);

CREATE INDEX IF NOT EXISTS idx_entities_organization ON entities(organization_id);
CREATE INDEX IF NOT EXISTS idx_entities_brand ON entities(brand_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_org_id_id ON entities(organization_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_wikidata ON entities(wikidata_id) WHERE wikidata_id IS NOT NULL AND deleted_at IS NULL;

-- Enable PostgreSQL Row Level Security (RLS) for zero-trust tenant isolation
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON entities;

DROP POLICY IF EXISTS select_tenant_isolation_policy ON entities;
CREATE POLICY select_tenant_isolation_policy ON entities
  FOR SELECT
  USING (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS insert_tenant_isolation_policy ON entities;
CREATE POLICY insert_tenant_isolation_policy ON entities
  FOR INSERT
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS update_tenant_isolation_policy ON entities;
CREATE POLICY update_tenant_isolation_policy ON entities
  FOR UPDATE
  USING (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS delete_tenant_isolation_policy ON entities;
CREATE POLICY delete_tenant_isolation_policy ON entities
  FOR DELETE
  USING (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
  `
};

export const entityRelationshipsTable: TableDefinition = {
  tableName: "entity_relationships",
  columns: [
    {
      name: "organization_id",
      type: "UUID",
      nullable: false,
      references: {
        table: "organizations",
        column: "id",
        onDelete: "CASCADE"
      },
      description: "Organization (tenant) partition key"
    },
    {
      name: "source_entity_id",
      type: "UUID",
      nullable: false,
      references: {
        table: "entities",
        column: "id",
        onDelete: "CASCADE"
      },
      description: "Origin entity identifier"
    },
    {
      name: "target_entity_id",
      type: "UUID",
      nullable: false,
      references: {
        table: "entities",
        column: "id",
        onDelete: "CASCADE"
      },
      description: "Destination entity identifier"
    },
    {
      name: "relationship_type",
      type: "TEXT",
      nullable: false,
      description: "Semantic link predicate (owns, creates, competes_with, related_to, mentioned_with)"
    },
    {
      name: "direction",
      type: "TEXT",
      nullable: false,
      default: "'directed'",
      description: "Link directionality: directed, undirected"
    },
    {
      name: "provenance",
      type: "JSONB",
      nullable: true,
      description: "Traceability source information and evidence context"
    },
    {
      name: "metadata",
      type: "JSONB",
      nullable: true,
      description: "Custom metadata properties associated with the relationship"
    },
    // Value Object: Confidence
    {
      name: "confidence_score",
      type: "DOUBLE PRECISION",
      nullable: false,
      default: "1.0",
      description: "Confidence rating value (0.0 to 1.0)"
    },
    {
      name: "confidence_rating",
      type: "TEXT",
      nullable: false,
      default: "'high'",
      description: "Rating category: high, medium, low"
    },
    // Audit & Lifecycle columns
    {
      name: "created_at",
      type: "TIMESTAMP",
      nullable: false,
      default: "NOW()",
      description: "Timestamp when the record was created"
    },
    {
      name: "updated_at",
      type: "TIMESTAMP",
      nullable: false,
      default: "NOW()",
      description: "Timestamp when the record was last updated"
    },
    {
      name: "created_by",
      type: "TEXT",
      nullable: false,
      default: "'system'",
      description: "User or service that created the record"
    },
    {
      name: "updated_by",
      type: "TEXT",
      nullable: false,
      default: "'system'",
      description: "User or service that last updated the record"
    },
    {
      name: "deleted_at",
      type: "TIMESTAMP",
      nullable: true,
      description: "Timestamp when soft-deletion occurred"
    },
    {
      name: "version",
      type: "INTEGER",
      nullable: false,
      default: "1",
      description: "Optimistic locking version counter"
    }
  ],
  indexes: [
    "CREATE INDEX idx_relationships_organization ON entity_relationships(organization_id);",
    "CREATE INDEX idx_relationships_source ON entity_relationships(source_entity_id);",
    "CREATE INDEX idx_relationships_target ON entity_relationships(target_entity_id);",
    "CREATE UNIQUE INDEX idx_entity_relationships_edge_unique ON entity_relationships(organization_id, source_entity_id, target_entity_id, relationship_type);"
  ],
  sql: `
CREATE TABLE IF NOT EXISTS entity_relationships (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_entity_id UUID NOT NULL,
  target_entity_id UUID NOT NULL,
  relationship_type TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'directed',
  provenance JSONB,
  metadata JSONB,
  confidence_score DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  confidence_rating TEXT NOT NULL DEFAULT 'high',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'system',
  updated_by TEXT NOT NULL DEFAULT 'system',
  deleted_at TIMESTAMP WITH TIME ZONE,
  version INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (source_entity_id, target_entity_id, relationship_type),
  CONSTRAINT fk_entity_rel_source_composite FOREIGN KEY (organization_id, source_entity_id) REFERENCES entities(organization_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_entity_rel_target_composite FOREIGN KEY (organization_id, target_entity_id) REFERENCES entities(organization_id, id) ON DELETE CASCADE,
  CONSTRAINT chk_entity_relationships_valid CHECK (
    confidence_score >= 0.0 AND confidence_score <= 1.0 AND
    direction IN ('directed', 'undirected')
  )
);

CREATE INDEX IF NOT EXISTS idx_relationships_organization ON entity_relationships(organization_id);
CREATE INDEX IF NOT EXISTS idx_relationships_source ON entity_relationships(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON entity_relationships(target_entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_relationships_edge_unique ON entity_relationships(organization_id, source_entity_id, target_entity_id, relationship_type);

-- Enable PostgreSQL Row Level Security (RLS) for zero-trust tenant isolation
ALTER TABLE entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_relationships FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON entity_relationships;

DROP POLICY IF EXISTS select_tenant_isolation_policy ON entity_relationships;
CREATE POLICY select_tenant_isolation_policy ON entity_relationships
  FOR SELECT
  USING (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS insert_tenant_isolation_policy ON entity_relationships;
CREATE POLICY insert_tenant_isolation_policy ON entity_relationships
  FOR INSERT
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS update_tenant_isolation_policy ON entity_relationships;
CREATE POLICY update_tenant_isolation_policy ON entity_relationships
  FOR UPDATE
  USING (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS delete_tenant_isolation_policy ON entity_relationships;
CREATE POLICY delete_tenant_isolation_policy ON entity_relationships
  FOR DELETE
  USING (organization_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
  `
};
