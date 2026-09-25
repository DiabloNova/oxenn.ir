-- DB-004: Repair referential integrity and lifecycle constraints
-- Objective: Eliminate orphanable and cross-tenant parent relationships and enforce database-level domain invariants.

-- 1. Parent Composite Unique Indexes (Required for composite FK references)
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_id_unique ON organizations(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_brands_org_id_id ON brands(organization_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_org_id_id ON entities(organization_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kg_entities_org_id_id ON kg_entities(organization_id, id);

-- 2. Quarantine / Backfill Existing Violations Before Constraint Enforcement
-- Quarantine cross-tenant entities
CREATE TABLE IF NOT EXISTS _quarantine_entities_cross_tenant AS
SELECT e.*
FROM entities e
JOIN brands b ON e.brand_id = b.id
WHERE e.organization_id != b.organization_id;

-- Backfill / Quarantine orphaned entities
CREATE TABLE IF NOT EXISTS _quarantine_entities_orphans AS
SELECT e.*
FROM entities e
LEFT JOIN brands b ON e.brand_id = b.id
WHERE b.id IS NULL;

-- 3. Drop existing single-column foreign keys that permit cross-tenant parents
ALTER TABLE entities DROP CONSTRAINT IF EXISTS entities_brand_id_brands_id_fk;
ALTER TABLE entities DROP CONSTRAINT IF EXISTS entities_organization_id_organizations_id_fk;
ALTER TABLE entity_relationships DROP CONSTRAINT IF EXISTS entity_relationships_source_entity_id_entities_id_fk;
ALTER TABLE entity_relationships DROP CONSTRAINT IF EXISTS entity_relationships_target_entity_id_entities_id_fk;
ALTER TABLE kg_relationships DROP CONSTRAINT IF EXISTS kg_relationships_source_entity_id_kg_entities_id_fk;
ALTER TABLE kg_relationships DROP CONSTRAINT IF EXISTS kg_relationships_target_entity_id_kg_entities_id_fk;

-- 4. Composite Foreign Keys
ALTER TABLE entities
  ADD CONSTRAINT fk_entities_brand_composite
  FOREIGN KEY (organization_id, brand_id)
  REFERENCES brands(organization_id, id)
  ON DELETE CASCADE NOT VALID;

ALTER TABLE entities VALIDATE CONSTRAINT fk_entities_brand_composite;

ALTER TABLE entity_relationships
  ADD CONSTRAINT fk_entity_rel_source_composite
  FOREIGN KEY (organization_id, source_entity_id)
  REFERENCES entities(organization_id, id)
  ON DELETE CASCADE NOT VALID;

ALTER TABLE entity_relationships VALIDATE CONSTRAINT fk_entity_rel_source_composite;

ALTER TABLE entity_relationships
  ADD CONSTRAINT fk_entity_rel_target_composite
  FOREIGN KEY (organization_id, target_entity_id)
  REFERENCES entities(organization_id, id)
  ON DELETE CASCADE NOT VALID;

ALTER TABLE entity_relationships VALIDATE CONSTRAINT fk_entity_rel_target_composite;

ALTER TABLE kg_relationships
  ADD CONSTRAINT fk_kg_rel_source_composite
  FOREIGN KEY (organization_id, source_entity_id)
  REFERENCES kg_entities(organization_id, id)
  ON DELETE CASCADE NOT VALID;

ALTER TABLE kg_relationships VALIDATE CONSTRAINT fk_kg_rel_source_composite;

ALTER TABLE kg_relationships
  ADD CONSTRAINT fk_kg_rel_target_composite
  FOREIGN KEY (organization_id, target_entity_id)
  REFERENCES kg_entities(organization_id, id)
  ON DELETE CASCADE NOT VALID;

ALTER TABLE kg_relationships VALIDATE CONSTRAINT fk_kg_rel_target_composite;

-- 5. Edge Uniqueness Constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_relationships_edge_unique
  ON entity_relationships(organization_id, source_entity_id, target_entity_id, relationship_type);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kg_relationships_edge_unique
  ON kg_relationships(organization_id, source_entity_id, target_entity_id, relationship_type);

-- 6. Quotas and Active Subscription Partial Uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_subscriptions_active_unique
  ON tenant_subscriptions(organization_id) WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_quotas_org_unique
  ON tenant_quotas(organization_id);

-- 7. CHECK Constraints
ALTER TABLE organization_members
  ADD CONSTRAINT chk_org_member_role
  CHECK (role IN ('super_admin', 'workspace_admin', 'viewer')) NOT VALID;

ALTER TABLE organization_members VALIDATE CONSTRAINT chk_org_member_role;

ALTER TABLE users
  ADD CONSTRAINT chk_users_failed_login_attempts
  CHECK (failed_login_attempts >= 0) NOT VALID;

ALTER TABLE users VALIDATE CONSTRAINT chk_users_failed_login_attempts;

ALTER TABLE auth_locks
  ADD CONSTRAINT chk_auth_locks_failure_count
  CHECK (failure_count >= 0) NOT VALID;

ALTER TABLE auth_locks VALIDATE CONSTRAINT chk_auth_locks_failure_count;

ALTER TABLE tenant_quotas
  ADD CONSTRAINT chk_tenant_quotas_non_negative
  CHECK (
    max_users >= 0 AND max_brands >= 0 AND max_prompts >= 0 AND
    used_observations_this_month >= 0 AND used_tokens_this_month >= 0 AND
    credits_balance >= 0
  ) NOT VALID;

ALTER TABLE tenant_quotas VALIDATE CONSTRAINT chk_tenant_quotas_non_negative;

ALTER TABLE entities
  ADD CONSTRAINT chk_entities_scores_ranges
  CHECK (
    authority_score >= 0.0 AND authority_score <= 100.0 AND
    completeness_score >= 0.0 AND completeness_score <= 100.0 AND
    confidence_score >= 0.0 AND confidence_score <= 1.0 AND
    status IN ('active', 'archived', 'merged')
  ) NOT VALID;

ALTER TABLE entities VALIDATE CONSTRAINT chk_entities_scores_ranges;

ALTER TABLE entity_relationships
  ADD CONSTRAINT chk_entity_relationships_valid
  CHECK (
    confidence_score >= 0.0 AND confidence_score <= 1.0 AND
    direction IN ('directed', 'undirected')
  ) NOT VALID;

ALTER TABLE entity_relationships VALIDATE CONSTRAINT chk_entity_relationships_valid;

-- 8. Last-Admin Protection Trigger
CREATE OR REPLACE FUNCTION prevent_last_admin_removal()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    IF (OLD.role IN ('workspace_admin', 'super_admin')) THEN
      SELECT COUNT(*) INTO admin_count
      FROM organization_members
      WHERE organization_id = OLD.organization_id
        AND role IN ('workspace_admin', 'super_admin')
        AND id != OLD.id;

      IF (admin_count = 0) THEN
        RAISE EXCEPTION 'Security Policy Violation: Cannot delete the sole administrator of organization %', OLD.organization_id;
      END IF;
    END IF;
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF (OLD.role IN ('workspace_admin', 'super_admin') AND NEW.role NOT IN ('workspace_admin', 'super_admin')) THEN
      SELECT COUNT(*) INTO admin_count
      FROM organization_members
      WHERE organization_id = OLD.organization_id
        AND role IN ('workspace_admin', 'super_admin')
        AND id != OLD.id;

      IF (admin_count = 0) THEN
        RAISE EXCEPTION 'Security Policy Violation: Cannot demote the sole administrator of organization %', OLD.organization_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_removal ON organization_members;
CREATE TRIGGER trg_prevent_last_admin_removal
  BEFORE DELETE OR UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_admin_removal();

-- 9. Soft-Delete Parent Lifecycle Protection Triggers
CREATE OR REPLACE FUNCTION enforce_entity_live_parent_brand()
RETURNS TRIGGER AS $$
DECLARE
  brand_deleted TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT deleted_at INTO brand_deleted
  FROM brands
  WHERE id = NEW.brand_id AND organization_id = NEW.organization_id;

  IF (brand_deleted IS NOT NULL) THEN
    RAISE EXCEPTION 'Lifecycle Constraint Violation: Entity % cannot reference soft-deleted brand %', NEW.id, NEW.brand_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_entity_live_parent_brand ON entities;
CREATE TRIGGER trg_enforce_entity_live_parent_brand
  BEFORE INSERT OR UPDATE ON entities
  FOR EACH ROW
  EXECUTE FUNCTION enforce_entity_live_parent_brand();

CREATE OR REPLACE FUNCTION prevent_brand_soft_delete_with_active_children()
RETURNS TRIGGER AS $$
DECLARE
  active_child_count INTEGER;
BEGIN
  IF (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN
    SELECT COUNT(*) INTO active_child_count
    FROM entities
    WHERE brand_id = NEW.id AND deleted_at IS NULL;

    IF (active_child_count > 0) THEN
      RAISE EXCEPTION 'Lifecycle Constraint Violation: Cannot soft-delete brand % with % active child entities', NEW.id, active_child_count;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_brand_soft_delete_with_active_children ON brands;
CREATE TRIGGER trg_prevent_brand_soft_delete_with_active_children
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION prevent_brand_soft_delete_with_active_children();
