-- DB-004: Repair referential integrity and lifecycle constraints
-- Objective: Eliminate orphanable and cross-tenant parent relationships and enforce database-level domain invariants.

-- 1. Parent Composite UNIQUE Constraints (Required for composite FK references in PostgreSQL)
ALTER TABLE brands DROP CONSTRAINT IF EXISTS brands_org_id_id_unique;
ALTER TABLE brands ADD CONSTRAINT brands_org_id_id_unique UNIQUE (organization_id, id);

ALTER TABLE entities DROP CONSTRAINT IF EXISTS entities_org_id_id_unique;
ALTER TABLE entities ADD CONSTRAINT entities_org_id_id_unique UNIQUE (organization_id, id);

ALTER TABLE kg_entities DROP CONSTRAINT IF EXISTS kg_entities_org_id_id_unique;
ALTER TABLE kg_entities ADD CONSTRAINT kg_entities_org_id_id_unique UNIQUE (organization_id, id);

-- 2. Quarantine & Remove Existing Violations Before Constraint Enforcement
-- Quarantine cross-tenant entities
CREATE TABLE IF NOT EXISTS _quarantine_entities_cross_tenant AS
SELECT e.*
FROM entities e
JOIN brands b ON e.brand_id = b.id
WHERE e.organization_id != b.organization_id;

-- Quarantine orphaned entities
CREATE TABLE IF NOT EXISTS _quarantine_entities_orphans AS
SELECT e.*
FROM entities e
LEFT JOIN brands b ON e.brand_id = b.id
WHERE b.id IS NULL;

-- Remove quarantined entities and dependent relationships
DELETE FROM entity_relationships WHERE source_entity_id IN (SELECT id FROM _quarantine_entities_cross_tenant)
   OR target_entity_id IN (SELECT id FROM _quarantine_entities_cross_tenant)
   OR source_entity_id IN (SELECT id FROM _quarantine_entities_orphans)
   OR target_entity_id IN (SELECT id FROM _quarantine_entities_orphans);

DELETE FROM entities e USING _quarantine_entities_cross_tenant q WHERE e.id = q.id;
DELETE FROM entities e USING _quarantine_entities_orphans q WHERE e.id = q.id;

-- Quarantine & remove cross-tenant / orphaned entity_relationships
CREATE TABLE IF NOT EXISTS _quarantine_entity_rel_invalid AS
SELECT r.*
FROM entity_relationships r
LEFT JOIN entities s ON r.source_entity_id = s.id
LEFT JOIN entities t ON r.target_entity_id = t.id
WHERE s.id IS NULL OR t.id IS NULL OR r.organization_id != s.organization_id OR r.organization_id != t.organization_id;

DELETE FROM entity_relationships r USING _quarantine_entity_rel_invalid q
WHERE r.source_entity_id = q.source_entity_id AND r.target_entity_id = q.target_entity_id AND r.relationship_type = q.relationship_type;

-- Deduplicate entity_relationships edges
DELETE FROM entity_relationships r1
USING entity_relationships r2
WHERE r1.ctid < r2.ctid
  AND r1.organization_id = r2.organization_id
  AND r1.source_entity_id = r2.source_entity_id
  AND r1.target_entity_id = r2.target_entity_id
  AND r1.relationship_type = r2.relationship_type;

-- Quarantine & remove cross-tenant / orphaned kg_relationships
CREATE TABLE IF NOT EXISTS _quarantine_kg_rel_invalid AS
SELECT r.*
FROM kg_relationships r
LEFT JOIN kg_entities s ON r.source_entity_id = s.id
LEFT JOIN kg_entities t ON r.target_entity_id = t.id
WHERE s.id IS NULL OR t.id IS NULL OR r.organization_id != s.organization_id OR r.organization_id != t.organization_id;

DELETE FROM kg_relationships r USING _quarantine_kg_rel_invalid q
WHERE r.id = q.id;

-- Deduplicate kg_relationships edges
DELETE FROM kg_relationships r1
USING kg_relationships r2
WHERE r1.ctid < r2.ctid
  AND r1.organization_id = r2.organization_id
  AND r1.source_entity_id = r2.source_entity_id
  AND r1.target_entity_id = r2.target_entity_id
  AND r1.relationship_type = r2.relationship_type;

-- Deduplicate tenant_subscriptions active ones
DELETE FROM tenant_subscriptions s1
USING tenant_subscriptions s2
WHERE s1.ctid < s2.ctid
  AND s1.organization_id = s2.organization_id
  AND s1.status = 'active'
  AND s2.status = 'active';

-- Deduplicate tenant_quotas
DELETE FROM tenant_quotas q1
USING tenant_quotas q2
WHERE q1.ctid < q2.ctid
  AND q1.organization_id = q2.organization_id;

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

-- 8. Last-Admin Protection Trigger (allows cascading deletes)
CREATE OR REPLACE FUNCTION prevent_last_admin_removal()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    -- Skip check if this delete is part of a cascading delete from organization or user
    IF pg_trigger_depth() > 1 OR
       NOT EXISTS (SELECT 1 FROM organizations WHERE id = OLD.organization_id) OR
       NOT EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id) THEN
      RETURN OLD;
    END IF;

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
  -- Only enforce when creating an active entity or updating brand_id/organization_id while entity is active
  IF (NEW.deleted_at IS NULL AND (TG_OP = 'INSERT' OR OLD.brand_id != NEW.brand_id OR OLD.organization_id != NEW.organization_id)) THEN
    SELECT deleted_at INTO brand_deleted
    FROM brands
    WHERE id = NEW.brand_id AND organization_id = NEW.organization_id;

    IF (brand_deleted IS NOT NULL) THEN
      RAISE EXCEPTION 'Lifecycle Constraint Violation: Entity % cannot reference soft-deleted brand %', NEW.id, NEW.brand_id;
    END IF;
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
