-- Migration to standardize tenant columns to organization_id (UUID), recreate RLS policies, and align credit_transactions schema

-- 1. Rename tenant_id -> organization_id where applicable
ALTER TABLE tenant_quotas RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE tenant_subscriptions RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE credit_transactions RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE aeo_analyses RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE faq_opportunities RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE kg_alignments RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE competitor_changes RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE competitive_seo_findings RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE document_embeddings RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE kg_entities RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE kg_relationships RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE crawl_jobs RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE crawl_results RENAME COLUMN tenant_id TO organization_id;
ALTER TABLE crawl_cache RENAME COLUMN tenant_id TO organization_id;

-- Ensure audits table exists and rename workspace_id -> organization_id if column exists
CREATE TABLE IF NOT EXISTS audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  raw_signals jsonb,
  ai_insights jsonb,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audits' AND column_name = 'workspace_id') THEN
    ALTER TABLE audits RENAME COLUMN workspace_id TO organization_id;
  END IF;
END $$;

-- 2. Drop dependent policies BEFORE altering column type
DROP POLICY IF EXISTS "crawl_tenant_policy" ON crawl_jobs;
DROP POLICY IF EXISTS "crawl_tenant_policy" ON crawl_results;
DROP POLICY IF EXISTS "crawl_tenant_policy" ON crawl_cache;

-- Convert type of organization_id on crawl tables from text to uuid
ALTER TABLE crawl_jobs ALTER COLUMN organization_id TYPE uuid USING organization_id::uuid;
ALTER TABLE crawl_results ALTER COLUMN organization_id TYPE uuid USING organization_id::uuid;
ALTER TABLE crawl_cache ALTER COLUMN organization_id TYPE uuid USING organization_id::uuid;

-- Add foreign keys to organizations(id) where standardized
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crawl_jobs_organization_id_organizations_id_fk') THEN
    ALTER TABLE crawl_jobs ADD CONSTRAINT crawl_jobs_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crawl_results_organization_id_organizations_id_fk') THEN
    ALTER TABLE crawl_results ADD CONSTRAINT crawl_results_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crawl_cache_organization_id_organizations_id_fk') THEN
    ALTER TABLE crawl_cache ADD CONSTRAINT crawl_cache_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Update credit_transactions schema columns
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS transaction_type text;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS reference_id text;
ALTER TABLE credit_transactions ALTER COLUMN description DROP NOT NULL;

-- 4. Recreate RLS Isolation Policies under organization_id

-- tenant_quotas
DROP POLICY IF EXISTS "select_tenant_id_isolation_policy" ON tenant_quotas;
DROP POLICY IF EXISTS "insert_tenant_id_isolation_policy" ON tenant_quotas;
DROP POLICY IF EXISTS "update_tenant_id_isolation_policy" ON tenant_quotas;
DROP POLICY IF EXISTS "delete_tenant_id_isolation_policy" ON tenant_quotas;
DROP POLICY IF EXISTS "select_organization_id_isolation_policy" ON tenant_quotas;
DROP POLICY IF EXISTS "insert_organization_id_isolation_policy" ON tenant_quotas;
DROP POLICY IF EXISTS "update_organization_id_isolation_policy" ON tenant_quotas;
DROP POLICY IF EXISTS "delete_organization_id_isolation_policy" ON tenant_quotas;
CREATE POLICY "select_organization_id_isolation_policy" ON tenant_quotas FOR SELECT USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "insert_organization_id_isolation_policy" ON tenant_quotas FOR INSERT WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "update_organization_id_isolation_policy" ON tenant_quotas FOR UPDATE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "delete_organization_id_isolation_policy" ON tenant_quotas FOR DELETE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- tenant_subscriptions
DROP POLICY IF EXISTS "select_tenant_id_isolation_policy" ON tenant_subscriptions;
DROP POLICY IF EXISTS "insert_tenant_id_isolation_policy" ON tenant_subscriptions;
DROP POLICY IF EXISTS "update_tenant_id_isolation_policy" ON tenant_subscriptions;
DROP POLICY IF EXISTS "delete_tenant_id_isolation_policy" ON tenant_subscriptions;
DROP POLICY IF EXISTS "select_organization_id_isolation_policy" ON tenant_subscriptions;
DROP POLICY IF EXISTS "insert_organization_id_isolation_policy" ON tenant_subscriptions;
DROP POLICY IF EXISTS "update_organization_id_isolation_policy" ON tenant_subscriptions;
DROP POLICY IF EXISTS "delete_organization_id_isolation_policy" ON tenant_subscriptions;
CREATE POLICY "select_organization_id_isolation_policy" ON tenant_subscriptions FOR SELECT USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "insert_organization_id_isolation_policy" ON tenant_subscriptions FOR INSERT WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "update_organization_id_isolation_policy" ON tenant_subscriptions FOR UPDATE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "delete_organization_id_isolation_policy" ON tenant_subscriptions FOR DELETE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- credit_transactions
DROP POLICY IF EXISTS "select_tenant_id_isolation_policy" ON credit_transactions;
DROP POLICY IF EXISTS "insert_tenant_id_isolation_policy" ON credit_transactions;
DROP POLICY IF EXISTS "update_tenant_id_isolation_policy" ON credit_transactions;
DROP POLICY IF EXISTS "delete_tenant_id_isolation_policy" ON credit_transactions;
DROP POLICY IF EXISTS "select_organization_id_isolation_policy" ON credit_transactions;
DROP POLICY IF EXISTS "insert_organization_id_isolation_policy" ON credit_transactions;
DROP POLICY IF EXISTS "update_organization_id_isolation_policy" ON credit_transactions;
DROP POLICY IF EXISTS "delete_organization_id_isolation_policy" ON credit_transactions;
CREATE POLICY "select_organization_id_isolation_policy" ON credit_transactions FOR SELECT USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "insert_organization_id_isolation_policy" ON credit_transactions FOR INSERT WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "update_organization_id_isolation_policy" ON credit_transactions FOR UPDATE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "delete_organization_id_isolation_policy" ON credit_transactions FOR DELETE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- audits
DROP POLICY IF EXISTS "select_workspace_id_isolation_policy" ON audits;
DROP POLICY IF EXISTS "insert_workspace_id_isolation_policy" ON audits;
DROP POLICY IF EXISTS "update_workspace_id_isolation_policy" ON audits;
DROP POLICY IF EXISTS "delete_workspace_id_isolation_policy" ON audits;
DROP POLICY IF EXISTS "select_organization_id_isolation_policy" ON audits;
DROP POLICY IF EXISTS "insert_organization_id_isolation_policy" ON audits;
DROP POLICY IF EXISTS "update_organization_id_isolation_policy" ON audits;
DROP POLICY IF EXISTS "delete_organization_id_isolation_policy" ON audits;
CREATE POLICY "select_organization_id_isolation_policy" ON audits FOR SELECT USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "insert_organization_id_isolation_policy" ON audits FOR INSERT WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "update_organization_id_isolation_policy" ON audits FOR UPDATE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "delete_organization_id_isolation_policy" ON audits FOR DELETE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- aeo_analyses
DROP POLICY IF EXISTS "select_tenant_id_isolation_policy" ON aeo_analyses;
DROP POLICY IF EXISTS "insert_tenant_id_isolation_policy" ON aeo_analyses;
DROP POLICY IF EXISTS "update_tenant_id_isolation_policy" ON aeo_analyses;
DROP POLICY IF EXISTS "delete_tenant_id_isolation_policy" ON aeo_analyses;
DROP POLICY IF EXISTS "select_organization_id_isolation_policy" ON aeo_analyses;
DROP POLICY IF EXISTS "insert_organization_id_isolation_policy" ON aeo_analyses;
DROP POLICY IF EXISTS "update_organization_id_isolation_policy" ON aeo_analyses;
DROP POLICY IF EXISTS "delete_organization_id_isolation_policy" ON aeo_analyses;
CREATE POLICY "select_organization_id_isolation_policy" ON aeo_analyses FOR SELECT USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "insert_organization_id_isolation_policy" ON aeo_analyses FOR INSERT WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "update_organization_id_isolation_policy" ON aeo_analyses FOR UPDATE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "delete_organization_id_isolation_policy" ON aeo_analyses FOR DELETE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- faq_opportunities
DROP POLICY IF EXISTS "select_tenant_id_isolation_policy" ON faq_opportunities;
DROP POLICY IF EXISTS "insert_tenant_id_isolation_policy" ON faq_opportunities;
DROP POLICY IF EXISTS "update_tenant_id_isolation_policy" ON faq_opportunities;
DROP POLICY IF EXISTS "delete_tenant_id_isolation_policy" ON faq_opportunities;
DROP POLICY IF EXISTS "select_organization_id_isolation_policy" ON faq_opportunities;
DROP POLICY IF EXISTS "insert_organization_id_isolation_policy" ON faq_opportunities;
DROP POLICY IF EXISTS "update_organization_id_isolation_policy" ON faq_opportunities;
DROP POLICY IF EXISTS "delete_organization_id_isolation_policy" ON faq_opportunities;
CREATE POLICY "select_organization_id_isolation_policy" ON faq_opportunities FOR SELECT USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "insert_organization_id_isolation_policy" ON faq_opportunities FOR INSERT WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "update_organization_id_isolation_policy" ON faq_opportunities FOR UPDATE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "delete_organization_id_isolation_policy" ON faq_opportunities FOR DELETE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- kg_alignments
DROP POLICY IF EXISTS "select_tenant_id_isolation_policy" ON kg_alignments;
DROP POLICY IF EXISTS "insert_tenant_id_isolation_policy" ON kg_alignments;
DROP POLICY IF EXISTS "update_tenant_id_isolation_policy" ON kg_alignments;
DROP POLICY IF EXISTS "delete_tenant_id_isolation_policy" ON kg_alignments;
DROP POLICY IF EXISTS "select_organization_id_isolation_policy" ON kg_alignments;
DROP POLICY IF EXISTS "insert_organization_id_isolation_policy" ON kg_alignments;
DROP POLICY IF EXISTS "update_organization_id_isolation_policy" ON kg_alignments;
DROP POLICY IF EXISTS "delete_organization_id_isolation_policy" ON kg_alignments;
CREATE POLICY "select_organization_id_isolation_policy" ON kg_alignments FOR SELECT USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "insert_organization_id_isolation_policy" ON kg_alignments FOR INSERT WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "update_organization_id_isolation_policy" ON kg_alignments FOR UPDATE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "delete_organization_id_isolation_policy" ON kg_alignments FOR DELETE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- competitor_changes
DROP POLICY IF EXISTS "select_tenant_id_isolation_policy" ON competitor_changes;
DROP POLICY IF EXISTS "insert_tenant_id_isolation_policy" ON competitor_changes;
DROP POLICY IF EXISTS "update_tenant_id_isolation_policy" ON competitor_changes;
DROP POLICY IF EXISTS "delete_tenant_id_isolation_policy" ON competitor_changes;
DROP POLICY IF EXISTS "select_organization_id_isolation_policy" ON competitor_changes;
DROP POLICY IF EXISTS "insert_organization_id_isolation_policy" ON competitor_changes;
DROP POLICY IF EXISTS "update_organization_id_isolation_policy" ON competitor_changes;
DROP POLICY IF EXISTS "delete_organization_id_isolation_policy" ON competitor_changes;
CREATE POLICY "select_organization_id_isolation_policy" ON competitor_changes FOR SELECT USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "insert_organization_id_isolation_policy" ON competitor_changes FOR INSERT WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "update_organization_id_isolation_policy" ON competitor_changes FOR UPDATE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "delete_organization_id_isolation_policy" ON competitor_changes FOR DELETE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- competitive_seo_findings
DROP POLICY IF EXISTS "select_tenant_id_isolation_policy" ON competitive_seo_findings;
DROP POLICY IF EXISTS "insert_tenant_id_isolation_policy" ON competitive_seo_findings;
DROP POLICY IF EXISTS "update_tenant_id_isolation_policy" ON competitive_seo_findings;
DROP POLICY IF EXISTS "delete_tenant_id_isolation_policy" ON competitive_seo_findings;
DROP POLICY IF EXISTS "select_organization_id_isolation_policy" ON competitive_seo_findings;
DROP POLICY IF EXISTS "insert_organization_id_isolation_policy" ON competitive_seo_findings;
DROP POLICY IF EXISTS "update_organization_id_isolation_policy" ON competitive_seo_findings;
DROP POLICY IF EXISTS "delete_organization_id_isolation_policy" ON competitive_seo_findings;
CREATE POLICY "select_organization_id_isolation_policy" ON competitive_seo_findings FOR SELECT USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "insert_organization_id_isolation_policy" ON competitive_seo_findings FOR INSERT WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "update_organization_id_isolation_policy" ON competitive_seo_findings FOR UPDATE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "delete_organization_id_isolation_policy" ON competitive_seo_findings FOR DELETE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- document_embeddings
DROP POLICY IF EXISTS "select_tenant_id_isolation_policy" ON document_embeddings;
DROP POLICY IF EXISTS "insert_tenant_id_isolation_policy" ON document_embeddings;
DROP POLICY IF EXISTS "update_tenant_id_isolation_policy" ON document_embeddings;
DROP POLICY IF EXISTS "delete_tenant_id_isolation_policy" ON document_embeddings;
DROP POLICY IF EXISTS "select_organization_id_isolation_policy" ON document_embeddings;
DROP POLICY IF EXISTS "insert_organization_id_isolation_policy" ON document_embeddings;
DROP POLICY IF EXISTS "update_organization_id_isolation_policy" ON document_embeddings;
DROP POLICY IF EXISTS "delete_organization_id_isolation_policy" ON document_embeddings;
CREATE POLICY "select_organization_id_isolation_policy" ON document_embeddings FOR SELECT USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "insert_organization_id_isolation_policy" ON document_embeddings FOR INSERT WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "update_organization_id_isolation_policy" ON document_embeddings FOR UPDATE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "delete_organization_id_isolation_policy" ON document_embeddings FOR DELETE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- kg_entities
DROP POLICY IF EXISTS "select_tenant_id_isolation_policy" ON kg_entities;
DROP POLICY IF EXISTS "insert_tenant_id_isolation_policy" ON kg_entities;
DROP POLICY IF EXISTS "update_tenant_id_isolation_policy" ON kg_entities;
DROP POLICY IF EXISTS "delete_tenant_id_isolation_policy" ON kg_entities;
DROP POLICY IF EXISTS "select_organization_id_isolation_policy" ON kg_entities;
DROP POLICY IF EXISTS "insert_organization_id_isolation_policy" ON kg_entities;
DROP POLICY IF EXISTS "update_organization_id_isolation_policy" ON kg_entities;
DROP POLICY IF EXISTS "delete_organization_id_isolation_policy" ON kg_entities;
CREATE POLICY "select_organization_id_isolation_policy" ON kg_entities FOR SELECT USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "insert_organization_id_isolation_policy" ON kg_entities FOR INSERT WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "update_organization_id_isolation_policy" ON kg_entities FOR UPDATE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "delete_organization_id_isolation_policy" ON kg_entities FOR DELETE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- kg_relationships
DROP POLICY IF EXISTS "select_tenant_id_isolation_policy" ON kg_relationships;
DROP POLICY IF EXISTS "insert_tenant_id_isolation_policy" ON kg_relationships;
DROP POLICY IF EXISTS "update_tenant_id_isolation_policy" ON kg_relationships;
DROP POLICY IF EXISTS "delete_tenant_id_isolation_policy" ON kg_relationships;
DROP POLICY IF EXISTS "select_organization_id_isolation_policy" ON kg_relationships;
DROP POLICY IF EXISTS "insert_organization_id_isolation_policy" ON kg_relationships;
DROP POLICY IF EXISTS "update_organization_id_isolation_policy" ON kg_relationships;
DROP POLICY IF EXISTS "delete_organization_id_isolation_policy" ON kg_relationships;
CREATE POLICY "select_organization_id_isolation_policy" ON kg_relationships FOR SELECT USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "insert_organization_id_isolation_policy" ON kg_relationships FOR INSERT WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "update_organization_id_isolation_policy" ON kg_relationships FOR UPDATE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "delete_organization_id_isolation_policy" ON kg_relationships FOR DELETE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- crawl_jobs
DROP POLICY IF EXISTS "select_organization_id_isolation_policy" ON crawl_jobs;
DROP POLICY IF EXISTS "insert_organization_id_isolation_policy" ON crawl_jobs;
DROP POLICY IF EXISTS "update_organization_id_isolation_policy" ON crawl_jobs;
DROP POLICY IF EXISTS "delete_organization_id_isolation_policy" ON crawl_jobs;
CREATE POLICY "select_organization_id_isolation_policy" ON crawl_jobs FOR SELECT USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "insert_organization_id_isolation_policy" ON crawl_jobs FOR INSERT WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "update_organization_id_isolation_policy" ON crawl_jobs FOR UPDATE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "delete_organization_id_isolation_policy" ON crawl_jobs FOR DELETE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- crawl_results
DROP POLICY IF EXISTS "select_organization_id_isolation_policy" ON crawl_results;
DROP POLICY IF EXISTS "insert_organization_id_isolation_policy" ON crawl_results;
DROP POLICY IF EXISTS "update_organization_id_isolation_policy" ON crawl_results;
DROP POLICY IF EXISTS "delete_organization_id_isolation_policy" ON crawl_results;
CREATE POLICY "select_organization_id_isolation_policy" ON crawl_results FOR SELECT USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "insert_organization_id_isolation_policy" ON crawl_results FOR INSERT WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "update_organization_id_isolation_policy" ON crawl_results FOR UPDATE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "delete_organization_id_isolation_policy" ON crawl_results FOR DELETE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- crawl_cache
DROP POLICY IF EXISTS "select_organization_id_isolation_policy" ON crawl_cache;
DROP POLICY IF EXISTS "insert_organization_id_isolation_policy" ON crawl_cache;
DROP POLICY IF EXISTS "update_organization_id_isolation_policy" ON crawl_cache;
DROP POLICY IF EXISTS "delete_organization_id_isolation_policy" ON crawl_cache;
CREATE POLICY "select_organization_id_isolation_policy" ON crawl_cache FOR SELECT USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "insert_organization_id_isolation_policy" ON crawl_cache FOR INSERT WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "update_organization_id_isolation_policy" ON crawl_cache FOR UPDATE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "delete_organization_id_isolation_policy" ON crawl_cache FOR DELETE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- citation_sources
DROP POLICY IF EXISTS "select_tenant_id_isolation_policy" ON citation_sources;
DROP POLICY IF EXISTS "insert_tenant_id_isolation_policy" ON citation_sources;
DROP POLICY IF EXISTS "update_tenant_id_isolation_policy" ON citation_sources;
DROP POLICY IF EXISTS "delete_tenant_id_isolation_policy" ON citation_sources;
DROP POLICY IF EXISTS "select_organization_id_isolation_policy" ON citation_sources;
DROP POLICY IF EXISTS "insert_organization_id_isolation_policy" ON citation_sources;
DROP POLICY IF EXISTS "update_organization_id_isolation_policy" ON citation_sources;
DROP POLICY IF EXISTS "delete_organization_id_isolation_policy" ON citation_sources;
CREATE POLICY "select_organization_id_isolation_policy" ON citation_sources FOR SELECT USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "insert_organization_id_isolation_policy" ON citation_sources FOR INSERT WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "update_organization_id_isolation_policy" ON citation_sources FOR UPDATE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid) WITH CHECK ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY "delete_organization_id_isolation_policy" ON citation_sources FOR DELETE USING ("organization_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
