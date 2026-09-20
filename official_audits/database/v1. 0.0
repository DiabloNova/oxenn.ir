BASELINE STATUS

Initial baseline scan revealed no leftover investigation artifacts inside the repository. The working tree was pristine.
Repository remains fully unmodified. No preexisting files altered, checked out, reset, or rewritten.

39-vs-45 RECONCILIATION

The previous report claimed "39 unique corrupted columns" but enumerated "45 column mappings".

Mechanically Derived Final Count:
- Distinct corrupted logical column paths: 43
- Total corrupted JSON occurrences: 48
- Total correction mappings: 48

Why the original "39" figure was wrong/incomplete:
1. Incomplete Occurrences Count (Length/Pattern Filtering): The previous logic enumerated 45 occurrences. Our scan found 48 total occurrences of underscore-stripped columns (excluding standard whitelist columns like 'id', 'createdat', etc. which were historically verified as non-corrupted). The 3 missing occurrences in the previous 45-entry list were likely omitted due to filtering logic—either missing boolean columns starting with "is" (e.g., isbrandmentioned, isverifieddomain, isenabledglobally) or skipping columns based on string length (e.g., crawljobid is exactly 10 characters).
2. Distinct Logical Paths vs Occurrences: In our mechanically derived 48 occurrences, there are exactly 5 duplicates (columns with the exact same name appearing in multiple tables, e.g., monitoringconfigid, sourceentityid, targetentityid, aeoanalysisid, lastcrawledat). 48 occurrences minus 5 duplicates = 43 distinct corrupted logical column paths.
3. The "39" Math Error: The previous count of 39 distinct paths derived from 45 occurrences mathematically implies 6 duplicates (45 - 39 = 6). Since there are only 5 valid cross-table duplicates among the corrupted columns, the "39" figure was mathematically flawed by over-counting duplicates (or manually omitting an additional unique column name while calculating the distinct count).

COLUMN INVENTORY

Distinct corrupted logical column paths: 43
Total corrupted JSON occurrences: 48
Total correction mappings: 48

Path Inventory (Occurrences):
public.aeo_analyses.overallaeoscore
public.aeo_analyses.entitycoveragescore
public.aeo_analyses.semanticcoveragescore
public.aeo_analyses.questioncoveragescore
public.aeo_analyses.citationreadinessscore
public.ai_observations.rawresponsetext
public.aiproviderconfigs.apikeymasked
public.aiproviderconfigs.failoverproviderid
public.aivisibilityaudits.targetbrandname
public.aivisibilityaudits.brandauthorityscore
public.aivisibilityaudits.citationreliabilityscore
public.aivisibilityaudits.recommendationsharescore
public.aivisibilityaudits.auditedengineids
public.aivisibilityaudits.auditedpromptscount
public.aivisibilityaudits.rawobservationscount
public.citation_occurrences.isbrandmentioned
public.citation_sources.isverifieddomain
public.crawl_jobs.providerjobid
public.crawl_jobs.leaseexpiresat
public.crawl_jobs.cancellationrequestedby
public.crawl_snapshots.monitoringconfigid
public.crawl_snapshots.crawljobid
public.crawl_snapshots.nonindexablepages
public.crawl_snapshots.error4xxcount
public.crawl_snapshots.error5xxcount
public.crawl_snapshots.robotstxtavailable
public.diagnosticfindingrelationships.parentfindingid
public.diagnosticfindingrelationships.childfindingid
public.entity_relationships.sourceentityid
public.entity_relationships.targetentityid
public.faq_opportunities.aeoanalysisid
public.feature_flags.isenabledglobally
public.kg_alignments.aeoanalysisid
public.kg_relationships.sourceentityid
public.kg_relationships.targetentityid
public.monitoring_alerts.monitoringconfigid
public.monitoring_alerts.crawlsnapshotid
public.pages.lastcrawledat
public.position_observations.sourceexecutionid
public.position_observations.subjectentityid
public.prompt_executions.resolvedprompttext
public.prompt_schedules.nextexecutionat
public.prompt_schedules.lastexecutionat
public.tenant_quotas.maxcrawljobsperday
public.tenant_quotas.monthlytokenlimit
public.topics.parenttopicid
public.websites.lastcrawledat
public.websites.lastanalyzedat

DEFAULT INVENTORY

Distinct affected columns: 59
Total corrupted default occurrences: 59
Total correction mappings: 59

Affected Table/Column Paths:
public.admin_users.id -> genrandomuuid()
public.aeo_analyses.id -> genrandomuuid()
public.ai_engines.id -> genrandomuuid()
public.ai_observations.id -> genrandomuuid()
public.aiproviderconfigs.id -> genrandomuuid()
public.aivisibilityaudits.id -> genrandomuuid()
public.audit_prompts.id -> genrandomuuid()
public.audit_records.id -> genrandomuuid()
public.brand_associations.id -> genrandomuuid()
public.brand_mentions.id -> genrandomuuid()
public.brands.id -> genrandomuuid()
public.citation_occurrences.id -> genrandomuuid()
public.citation_sources.id -> genrandomuuid()
public.citations.id -> genrandomuuid()
public.competitive_analyses.id -> genrandomuuid()
public.competitiveseofindings.id -> genrandomuuid()
public.competitor_changes.id -> genrandomuuid()
public.competitor_mentions.id -> genrandomuuid()
public.competitors.id -> genrandomuuid()
public.crawl_cache.id -> genrandomuuid()
public.crawl_jobs.id -> genrandomuuid()
public.crawl_results.id -> genrandomuuid()
public.crawl_snapshots.id -> genrandomuuid()
public.credit_transactions.id -> genrandomuuid()
public.diagnosticfindingrelationships.id -> genrandomuuid()
public.diagnostic_findings.id -> genrandomuuid()
public.document_embeddings.id -> genrandomuuid()
public.entities.id -> genrandomuuid()
public.entity_relationships.id -> genrandomuuid()
public.faq_opportunities.id -> genrandomuuid()
public.feature_flags.id -> genrandomuuid()
public.historical_metrics.id -> genrandomuuid()
public.keywords.id -> genrandomuuid()
public.kg_alignments.id -> genrandomuuid()
public.kg_entities.id -> genrandomuuid()
public.kg_relationships.id -> genrandomuuid()
public.monitoring_alerts.id -> genrandomuuid()
public.monitoring_configs.id -> genrandomuuid()
public.organization_invitations.id -> genrandomuuid()
public.organization_members.id -> genrandomuuid()
public.organizations.id -> genrandomuuid()
public.pages.id -> genrandomuuid()
public.permissions.id -> genrandomuuid()
public.position_observations.id -> genrandomuuid()
public.premium_audits.id -> genrandomuuid()
public.prompt_definitions.id -> genrandomuuid()
public.prompt_executions.id -> genrandomuuid()
public.prompt_schedules.id -> genrandomuuid()
public.prompts.id -> genrandomuuid()
public.recommendation_observations.id -> genrandomuuid()
public.recommendations.id -> genrandomuuid()
public.roles.id -> genrandomuuid()
public.system_configurations.id -> genrandomuuid()
public.technical_audits.id -> genrandomuuid()
public.tenant_quotas.id -> genrandomuuid()
public.tenant_subscriptions.id -> genrandomuuid()
public.topics.id -> genrandomuuid()
public.visibility_scores.id -> genrandomuuid()
public.websites.id -> genrandomuuid()

POLICY INVENTORY

Distinct logical policies: 195
Corrupted policy-key occurrences: 195
Corrupted policy-name occurrences: 195
Corrupted "using" occurrences: 144
Corrupted "withCheck" / "with check" occurrences: 97

Note: For each logical policy, the policy key and its 'name' property represent the same logical policy, but are counted as two separate JSON occurrences.

Inventory:
--- Keys ---
public.aeo_analyses.selecttenantidisolationpolicy (key)
public.aeo_analyses.inserttenantidisolationpolicy (key)
public.aeo_analyses.updatetenantidisolationpolicy (key)
public.aeo_analyses.deletetenantidisolationpolicy (key)
public.ai_observations.selectorganizationidisolationpolicy (key)
public.ai_observations.insertorganizationidisolationpolicy (key)
public.ai_observations.updateorganizationidisolationpolicy (key)
public.ai_observations.deleteorganizationidisolationpolicy (key)
public.aivisibilityaudits.selectorganizationidisolationpolicy (key)
public.aivisibilityaudits.insertorganizationidisolationpolicy (key)
public.aivisibilityaudits.updateorganizationidisolationpolicy (key)
public.aivisibilityaudits.deleteorganizationidisolationpolicy (key)
public.audit_prompts.selectorganizationidisolationpolicy (key)
public.audit_prompts.insertorganizationidisolationpolicy (key)
public.audit_prompts.updateorganizationidisolationpolicy (key)
public.audit_prompts.deleteorganizationidisolationpolicy (key)
public.brand_associations.selectorganizationidisolationpolicy (key)
public.brand_associations.insertorganizationidisolationpolicy (key)
public.brand_associations.updateorganizationidisolationpolicy (key)
public.brand_associations.deleteorganizationidisolationpolicy (key)
public.brand_mentions.selectorganizationidisolationpolicy (key)
public.brand_mentions.insertorganizationidisolationpolicy (key)
public.brand_mentions.updateorganizationidisolationpolicy (key)
public.brand_mentions.deleteorganizationidisolationpolicy (key)
public.brands.selectorganizationidisolationpolicy (key)
public.brands.insertorganizationidisolationpolicy (key)
public.brands.updateorganizationidisolationpolicy (key)
public.brands.deleteorganizationidisolationpolicy (key)
public.citation_occurrences.selectorganizationidisolationpolicy (key)
public.citation_occurrences.insertorganizationidisolationpolicy (key)
public.citation_occurrences.updateorganizationidisolationpolicy (key)
public.citation_occurrences.deleteorganizationidisolationpolicy (key)
public.citation_sources.selectorganizationidisolationpolicy (key)
public.citation_sources.insertorganizationidisolationpolicy (key)
public.citation_sources.updateorganizationidisolationpolicy (key)
public.citation_sources.deleteorganizationidisolationpolicy (key)
public.citations.selectorganizationidisolationpolicy (key)
public.citations.insertorganizationidisolationpolicy (key)
public.citations.updateorganizationidisolationpolicy (key)
public.citations.deleteorganizationidisolationpolicy (key)
public.competitive_analyses.selectorganizationidisolationpolicy (key)
public.competitive_analyses.insertorganizationidisolationpolicy (key)
public.competitive_analyses.updateorganizationidisolationpolicy (key)
public.competitive_analyses.deleteorganizationidisolationpolicy (key)
public.competitiveseofindings.selecttenantidisolationpolicy (key)
public.competitiveseofindings.inserttenantidisolationpolicy (key)
public.competitiveseofindings.updatetenantidisolationpolicy (key)
public.competitiveseofindings.deletetenantidisolationpolicy (key)
public.competitor_changes.selecttenantidisolationpolicy (key)
public.competitor_changes.inserttenantidisolationpolicy (key)
public.competitor_changes.updatetenantidisolationpolicy (key)
public.competitor_changes.deletetenantidisolationpolicy (key)
public.competitor_mentions.selectorganizationidisolationpolicy (key)
public.competitor_mentions.insertorganizationidisolationpolicy (key)
public.competitor_mentions.updateorganizationidisolationpolicy (key)
public.competitor_mentions.deleteorganizationidisolationpolicy (key)
public.competitors.selectorganizationidisolationpolicy (key)
public.competitors.insertorganizationidisolationpolicy (key)
public.competitors.updateorganizationidisolationpolicy (key)
public.competitors.deleteorganizationidisolationpolicy (key)
public.crawl_cache.crawltenantpolicy (key)
public.crawl_jobs.crawltenantpolicy (key)
public.crawl_results.crawltenantpolicy (key)
public.crawl_snapshots.selectorganizationidisolationpolicy (key)
public.crawl_snapshots.insertorganizationidisolationpolicy (key)
public.crawl_snapshots.updateorganizationidisolationpolicy (key)
public.crawl_snapshots.deleteorganizationidisolationpolicy (key)
public.credit_transactions.selecttenantidisolationpolicy (key)
public.credit_transactions.inserttenantidisolationpolicy (key)
public.credit_transactions.updatetenantidisolationpolicy (key)
public.credit_transactions.deletetenantidisolationpolicy (key)
public.diagnosticfindingrelationships.selectorganizationidisolationpolicy (key)
public.diagnosticfindingrelationships.insertorganizationidisolationpolicy (key)
public.diagnosticfindingrelationships.updateorganizationidisolationpolicy (key)
public.diagnosticfindingrelationships.deleteorganizationidisolationpolicy (key)
public.diagnostic_findings.selectorganizationidisolationpolicy (key)
public.diagnostic_findings.insertorganizationidisolationpolicy (key)
public.diagnostic_findings.updateorganizationidisolationpolicy (key)
public.diagnostic_findings.deleteorganizationidisolationpolicy (key)
public.document_embeddings.selecttenantidisolationpolicy (key)
public.document_embeddings.inserttenantidisolationpolicy (key)
public.document_embeddings.updatetenantidisolationpolicy (key)
public.document_embeddings.deletetenantidisolationpolicy (key)
public.entities.selectorganizationidisolationpolicy (key)
public.entities.insertorganizationidisolationpolicy (key)
public.entities.updateorganizationidisolationpolicy (key)
public.entities.deleteorganizationidisolationpolicy (key)
public.entity_relationships.selectorganizationidisolationpolicy (key)
public.entity_relationships.insertorganizationidisolationpolicy (key)
public.entity_relationships.updateorganizationidisolationpolicy (key)
public.entity_relationships.deleteorganizationidisolationpolicy (key)
public.faq_opportunities.selecttenantidisolationpolicy (key)
public.faq_opportunities.inserttenantidisolationpolicy (key)
public.faq_opportunities.updatetenantidisolationpolicy (key)
public.faq_opportunities.deletetenantidisolationpolicy (key)
public.historical_metrics.selectorganizationidisolationpolicy (key)
public.historical_metrics.insertorganizationidisolationpolicy (key)
public.historical_metrics.updateorganizationidisolationpolicy (key)
public.historical_metrics.deleteorganizationidisolationpolicy (key)
public.keywords.selectorganizationidisolationpolicy (key)
public.keywords.insertorganizationidisolationpolicy (key)
public.keywords.updateorganizationidisolationpolicy (key)
public.keywords.deleteorganizationidisolationpolicy (key)
public.kg_alignments.selecttenantidisolationpolicy (key)
public.kg_alignments.inserttenantidisolationpolicy (key)
public.kg_alignments.updatetenantidisolationpolicy (key)
public.kg_alignments.deletetenantidisolationpolicy (key)
public.kg_entities.selecttenantidisolationpolicy (key)
public.kg_entities.inserttenantidisolationpolicy (key)
public.kg_entities.updatetenantidisolationpolicy (key)
public.kg_entities.deletetenantidisolationpolicy (key)
public.kg_relationships.selecttenantidisolationpolicy (key)
public.kg_relationships.inserttenantidisolationpolicy (key)
public.kg_relationships.updatetenantidisolationpolicy (key)
public.kg_relationships.deletetenantidisolationpolicy (key)
public.monitoring_alerts.selectorganizationidisolationpolicy (key)
public.monitoring_alerts.insertorganizationidisolationpolicy (key)
public.monitoring_alerts.updateorganizationidisolationpolicy (key)
public.monitoring_alerts.deleteorganizationidisolationpolicy (key)
public.monitoring_configs.selectorganizationidisolationpolicy (key)
public.monitoring_configs.insertorganizationidisolationpolicy (key)
public.monitoring_configs.updateorganizationidisolationpolicy (key)
public.monitoring_configs.deleteorganizationidisolationpolicy (key)
public.organization_invitations.selectorganizationidisolationpolicy (key)
public.organization_invitations.insertorganizationidisolationpolicy (key)
public.organization_invitations.updateorganizationidisolationpolicy (key)
public.organization_invitations.deleteorganizationidisolationpolicy (key)
public.organization_members.selectorganizationidisolationpolicy (key)
public.organization_members.insertorganizationidisolationpolicy (key)
public.organization_members.updateorganizationidisolationpolicy (key)
public.organization_members.deleteorganizationidisolationpolicy (key)
public.organizations.selectorgisolation_policy (key)
public.organizations.insertorgisolation_policy (key)
public.organizations.updateorgisolation_policy (key)
public.organizations.deleteorgisolation_policy (key)
public.pages.selectorganizationidisolationpolicy (key)
public.pages.insertorganizationidisolationpolicy (key)
public.pages.updateorganizationidisolationpolicy (key)
public.pages.deleteorganizationidisolationpolicy (key)
public.position_observations.selectorganizationidisolationpolicy (key)
public.position_observations.insertorganizationidisolationpolicy (key)
public.position_observations.updateorganizationidisolationpolicy (key)
public.position_observations.deleteorganizationidisolationpolicy (key)
public.premium_audits.selectorganizationidisolationpolicy (key)
public.premium_audits.insertorganizationidisolationpolicy (key)
public.premium_audits.updateorganizationidisolationpolicy (key)
public.premium_audits.deleteorganizationidisolationpolicy (key)
public.prompt_definitions.selectorganizationidisolationpolicy (key)
public.prompt_definitions.insertorganizationidisolationpolicy (key)
public.prompt_definitions.updateorganizationidisolationpolicy (key)
public.prompt_definitions.deleteorganizationidisolationpolicy (key)
public.prompt_executions.selectorganizationidisolationpolicy (key)
public.prompt_executions.insertorganizationidisolationpolicy (key)
public.prompt_executions.updateorganizationidisolationpolicy (key)
public.prompt_executions.deleteorganizationidisolationpolicy (key)
public.prompt_schedules.selectorganizationidisolationpolicy (key)
public.prompt_schedules.insertorganizationidisolationpolicy (key)
public.prompt_schedules.updateorganizationidisolationpolicy (key)
public.prompt_schedules.deleteorganizationidisolationpolicy (key)
public.prompts.selectorganizationidisolationpolicy (key)
public.prompts.insertorganizationidisolationpolicy (key)
public.prompts.updateorganizationidisolationpolicy (key)
public.prompts.deleteorganizationidisolationpolicy (key)
public.recommendation_observations.selectorganizationidisolationpolicy (key)
public.recommendation_observations.insertorganizationidisolationpolicy (key)
public.recommendation_observations.updateorganizationidisolationpolicy (key)
public.recommendation_observations.deleteorganizationidisolationpolicy (key)
public.recommendations.selectorganizationidisolationpolicy (key)
public.recommendations.insertorganizationidisolationpolicy (key)
public.recommendations.updateorganizationidisolationpolicy (key)
public.recommendations.deleteorganizationidisolationpolicy (key)
public.technical_audits.selectorganizationidisolationpolicy (key)
public.technical_audits.insertorganizationidisolationpolicy (key)
public.technical_audits.updateorganizationidisolationpolicy (key)
public.technical_audits.deleteorganizationidisolationpolicy (key)
public.tenant_quotas.selecttenantidisolationpolicy (key)
public.tenant_quotas.inserttenantidisolationpolicy (key)
public.tenant_quotas.updatetenantidisolationpolicy (key)
public.tenant_quotas.deletetenantidisolationpolicy (key)
public.tenant_subscriptions.selecttenantidisolationpolicy (key)
public.tenant_subscriptions.inserttenantidisolationpolicy (key)
public.tenant_subscriptions.updatetenantidisolationpolicy (key)
public.tenant_subscriptions.deletetenantidisolationpolicy (key)
public.topics.selectorganizationidisolationpolicy (key)
public.topics.insertorganizationidisolationpolicy (key)
public.topics.updateorganizationidisolationpolicy (key)
public.topics.deleteorganizationidisolationpolicy (key)
public.visibility_scores.selectorganizationidisolationpolicy (key)
public.visibility_scores.insertorganizationidisolationpolicy (key)
public.visibility_scores.updateorganizationidisolationpolicy (key)
public.visibility_scores.deleteorganizationidisolationpolicy (key)
public.websites.selectorganizationidisolationpolicy (key)
public.websites.insertorganizationidisolationpolicy (key)
public.websites.updateorganizationidisolationpolicy (key)
public.websites.deleteorganizationidisolationpolicy (key)

--- Names ---
public.aeo_analyses.selecttenantidisolationpolicy (name)
public.aeo_analyses.inserttenantidisolationpolicy (name)
public.aeo_analyses.updatetenantidisolationpolicy (name)
public.aeo_analyses.deletetenantidisolationpolicy (name)
public.ai_observations.selectorganizationidisolationpolicy (name)
public.ai_observations.insertorganizationidisolationpolicy (name)
public.ai_observations.updateorganizationidisolationpolicy (name)
public.ai_observations.deleteorganizationidisolationpolicy (name)
public.aivisibilityaudits.selectorganizationidisolationpolicy (name)
public.aivisibilityaudits.insertorganizationidisolationpolicy (name)
public.aivisibilityaudits.updateorganizationidisolationpolicy (name)
public.aivisibilityaudits.deleteorganizationidisolationpolicy (name)
public.audit_prompts.selectorganizationidisolationpolicy (name)
public.audit_prompts.insertorganizationidisolationpolicy (name)
public.audit_prompts.updateorganizationidisolationpolicy (name)
public.audit_prompts.deleteorganizationidisolationpolicy (name)
public.brand_associations.selectorganizationidisolationpolicy (name)
public.brand_associations.insertorganizationidisolationpolicy (name)
public.brand_associations.updateorganizationidisolationpolicy (name)
public.brand_associations.deleteorganizationidisolationpolicy (name)
public.brand_mentions.selectorganizationidisolationpolicy (name)
public.brand_mentions.insertorganizationidisolationpolicy (name)
public.brand_mentions.updateorganizationidisolationpolicy (name)
public.brand_mentions.deleteorganizationidisolationpolicy (name)
public.brands.selectorganizationidisolationpolicy (name)
public.brands.insertorganizationidisolationpolicy (name)
public.brands.updateorganizationidisolationpolicy (name)
public.brands.deleteorganizationidisolationpolicy (name)
public.citation_occurrences.selectorganizationidisolationpolicy (name)
public.citation_occurrences.insertorganizationidisolationpolicy (name)
public.citation_occurrences.updateorganizationidisolationpolicy (name)
public.citation_occurrences.deleteorganizationidisolationpolicy (name)
public.citation_sources.selectorganizationidisolationpolicy (name)
public.citation_sources.insertorganizationidisolationpolicy (name)
public.citation_sources.updateorganizationidisolationpolicy (name)
public.citation_sources.deleteorganizationidisolationpolicy (name)
public.citations.selectorganizationidisolationpolicy (name)
public.citations.insertorganizationidisolationpolicy (name)
public.citations.updateorganizationidisolationpolicy (name)
public.citations.deleteorganizationidisolationpolicy (name)
public.competitive_analyses.selectorganizationidisolationpolicy (name)
public.competitive_analyses.insertorganizationidisolationpolicy (name)
public.competitive_analyses.updateorganizationidisolationpolicy (name)
public.competitive_analyses.deleteorganizationidisolationpolicy (name)
public.competitiveseofindings.selecttenantidisolationpolicy (name)
public.competitiveseofindings.inserttenantidisolationpolicy (name)
public.competitiveseofindings.updatetenantidisolationpolicy (name)
public.competitiveseofindings.deletetenantidisolationpolicy (name)
public.competitor_changes.selecttenantidisolationpolicy (name)
public.competitor_changes.inserttenantidisolationpolicy (name)
public.competitor_changes.updatetenantidisolationpolicy (name)
public.competitor_changes.deletetenantidisolationpolicy (name)
public.competitor_mentions.selectorganizationidisolationpolicy (name)
public.competitor_mentions.insertorganizationidisolationpolicy (name)
public.competitor_mentions.updateorganizationidisolationpolicy (name)
public.competitor_mentions.deleteorganizationidisolationpolicy (name)
public.competitors.selectorganizationidisolationpolicy (name)
public.competitors.insertorganizationidisolationpolicy (name)
public.competitors.updateorganizationidisolationpolicy (name)
public.competitors.deleteorganizationidisolationpolicy (name)
public.crawl_cache.crawltenantpolicy (name)
public.crawl_jobs.crawltenantpolicy (name)
public.crawl_results.crawltenantpolicy (name)
public.crawl_snapshots.selectorganizationidisolationpolicy (name)
public.crawl_snapshots.insertorganizationidisolationpolicy (name)
public.crawl_snapshots.updateorganizationidisolationpolicy (name)
public.crawl_snapshots.deleteorganizationidisolationpolicy (name)
public.credit_transactions.selecttenantidisolationpolicy (name)
public.credit_transactions.inserttenantidisolationpolicy (name)
public.credit_transactions.updatetenantidisolationpolicy (name)
public.credit_transactions.deletetenantidisolationpolicy (name)
public.diagnosticfindingrelationships.selectorganizationidisolationpolicy (name)
public.diagnosticfindingrelationships.insertorganizationidisolationpolicy (name)
public.diagnosticfindingrelationships.updateorganizationidisolationpolicy (name)
public.diagnosticfindingrelationships.deleteorganizationidisolationpolicy (name)
public.diagnostic_findings.selectorganizationidisolationpolicy (name)
public.diagnostic_findings.insertorganizationidisolationpolicy (name)
public.diagnostic_findings.updateorganizationidisolationpolicy (name)
public.diagnostic_findings.deleteorganizationidisolationpolicy (name)
public.document_embeddings.selecttenantidisolationpolicy (name)
public.document_embeddings.inserttenantidisolationpolicy (name)
public.document_embeddings.updatetenantidisolationpolicy (name)
public.document_embeddings.deletetenantidisolationpolicy (name)
public.entities.selectorganizationidisolationpolicy (name)
public.entities.insertorganizationidisolationpolicy (name)
public.entities.updateorganizationidisolationpolicy (name)
public.entities.deleteorganizationidisolationpolicy (name)
public.entity_relationships.selectorganizationidisolationpolicy (name)
public.entity_relationships.insertorganizationidisolationpolicy (name)
public.entity_relationships.updateorganizationidisolationpolicy (name)
public.entity_relationships.deleteorganizationidisolationpolicy (name)
public.faq_opportunities.selecttenantidisolationpolicy (name)
public.faq_opportunities.inserttenantidisolationpolicy (name)
public.faq_opportunities.updatetenantidisolationpolicy (name)
public.faq_opportunities.deletetenantidisolationpolicy (name)
public.historical_metrics.selectorganizationidisolationpolicy (name)
public.historical_metrics.insertorganizationidisolationpolicy (name)
public.historical_metrics.updateorganizationidisolationpolicy (name)
public.historical_metrics.deleteorganizationidisolationpolicy (name)
public.keywords.selectorganizationidisolationpolicy (name)
public.keywords.insertorganizationidisolationpolicy (name)
public.keywords.updateorganizationidisolationpolicy (name)
public.keywords.deleteorganizationidisolationpolicy (name)
public.kg_alignments.selecttenantidisolationpolicy (name)
public.kg_alignments.inserttenantidisolationpolicy (name)
public.kg_alignments.updatetenantidisolationpolicy (name)
public.kg_alignments.deletetenantidisolationpolicy (name)
public.kg_entities.selecttenantidisolationpolicy (name)
public.kg_entities.inserttenantidisolationpolicy (name)
public.kg_entities.updatetenantidisolationpolicy (name)
public.kg_entities.deletetenantidisolationpolicy (name)
public.kg_relationships.selecttenantidisolationpolicy (name)
public.kg_relationships.inserttenantidisolationpolicy (name)
public.kg_relationships.updatetenantidisolationpolicy (name)
public.kg_relationships.deletetenantidisolationpolicy (name)
public.monitoring_alerts.selectorganizationidisolationpolicy (name)
public.monitoring_alerts.insertorganizationidisolationpolicy (name)
public.monitoring_alerts.updateorganizationidisolationpolicy (name)
public.monitoring_alerts.deleteorganizationidisolationpolicy (name)
public.monitoring_configs.selectorganizationidisolationpolicy (name)
public.monitoring_configs.insertorganizationidisolationpolicy (name)
public.monitoring_configs.updateorganizationidisolationpolicy (name)
public.monitoring_configs.deleteorganizationidisolationpolicy (name)
public.organization_invitations.selectorganizationidisolationpolicy (name)
public.organization_invitations.insertorganizationidisolationpolicy (name)
public.organization_invitations.updateorganizationidisolationpolicy (name)
public.organization_invitations.deleteorganizationidisolationpolicy (name)
public.organization_members.selectorganizationidisolationpolicy (name)
public.organization_members.insertorganizationidisolationpolicy (name)
public.organization_members.updateorganizationidisolationpolicy (name)
public.organization_members.deleteorganizationidisolationpolicy (name)
public.organizations.selectorgisolation_policy (name)
public.organizations.insertorgisolation_policy (name)
public.organizations.updateorgisolation_policy (name)
public.organizations.deleteorgisolation_policy (name)
public.pages.selectorganizationidisolationpolicy (name)
public.pages.insertorganizationidisolationpolicy (name)
public.pages.updateorganizationidisolationpolicy (name)
public.pages.deleteorganizationidisolationpolicy (name)
public.position_observations.selectorganizationidisolationpolicy (name)
public.position_observations.insertorganizationidisolationpolicy (name)
public.position_observations.updateorganizationidisolationpolicy (name)
public.position_observations.deleteorganizationidisolationpolicy (name)
public.premium_audits.selectorganizationidisolationpolicy (name)
public.premium_audits.insertorganizationidisolationpolicy (name)
public.premium_audits.updateorganizationidisolationpolicy (name)
public.premium_audits.deleteorganizationidisolationpolicy (name)
public.prompt_definitions.selectorganizationidisolationpolicy (name)
public.prompt_definitions.insertorganizationidisolationpolicy (name)
public.prompt_definitions.updateorganizationidisolationpolicy (name)
public.prompt_definitions.deleteorganizationidisolationpolicy (name)
public.prompt_executions.selectorganizationidisolationpolicy (name)
public.prompt_executions.insertorganizationidisolationpolicy (name)
public.prompt_executions.updateorganizationidisolationpolicy (name)
public.prompt_executions.deleteorganizationidisolationpolicy (name)
public.prompt_schedules.selectorganizationidisolationpolicy (name)
public.prompt_schedules.insertorganizationidisolationpolicy (name)
public.prompt_schedules.updateorganizationidisolationpolicy (name)
public.prompt_schedules.deleteorganizationidisolationpolicy (name)
public.prompts.selectorganizationidisolationpolicy (name)
public.prompts.insertorganizationidisolationpolicy (name)
public.prompts.updateorganizationidisolationpolicy (name)
public.prompts.deleteorganizationidisolationpolicy (name)
public.recommendation_observations.selectorganizationidisolationpolicy (name)
public.recommendation_observations.insertorganizationidisolationpolicy (name)
public.recommendation_observations.updateorganizationidisolationpolicy (name)
public.recommendation_observations.deleteorganizationidisolationpolicy (name)
public.recommendations.selectorganizationidisolationpolicy (name)
public.recommendations.insertorganizationidisolationpolicy (name)
public.recommendations.updateorganizationidisolationpolicy (name)
public.recommendations.deleteorganizationidisolationpolicy (name)
public.technical_audits.selectorganizationidisolationpolicy (name)
public.technical_audits.insertorganizationidisolationpolicy (name)
public.technical_audits.updateorganizationidisolationpolicy (name)
public.technical_audits.deleteorganizationidisolationpolicy (name)
public.tenant_quotas.selecttenantidisolationpolicy (name)
public.tenant_quotas.inserttenantidisolationpolicy (name)
public.tenant_quotas.updatetenantidisolationpolicy (name)
public.tenant_quotas.deletetenantidisolationpolicy (name)
public.tenant_subscriptions.selecttenantidisolationpolicy (name)
public.tenant_subscriptions.inserttenantidisolationpolicy (name)
public.tenant_subscriptions.updatetenantidisolationpolicy (name)
public.tenant_subscriptions.deletetenantidisolationpolicy (name)
public.topics.selectorganizationidisolationpolicy (name)
public.topics.insertorganizationidisolationpolicy (name)
public.topics.updateorganizationidisolationpolicy (name)
public.topics.deleteorganizationidisolationpolicy (name)
public.visibility_scores.selectorganizationidisolationpolicy (name)
public.visibility_scores.insertorganizationidisolationpolicy (name)
public.visibility_scores.updateorganizationidisolationpolicy (name)
public.visibility_scores.deleteorganizationidisolationpolicy (name)
public.websites.selectorganizationidisolationpolicy (name)
public.websites.insertorganizationidisolationpolicy (name)
public.websites.updateorganizationidisolationpolicy (name)
public.websites.deleteorganizationidisolationpolicy (name)

--- Using ---
public.aeo_analyses.selecttenantidisolationpolicy (using)
public.aeo_analyses.updatetenantidisolationpolicy (using)
public.aeo_analyses.deletetenantidisolationpolicy (using)
public.ai_observations.selectorganizationidisolationpolicy (using)
public.ai_observations.updateorganizationidisolationpolicy (using)
public.ai_observations.deleteorganizationidisolationpolicy (using)
public.aivisibilityaudits.selectorganizationidisolationpolicy (using)
public.aivisibilityaudits.updateorganizationidisolationpolicy (using)
public.aivisibilityaudits.deleteorganizationidisolationpolicy (using)
public.audit_prompts.selectorganizationidisolationpolicy (using)
public.audit_prompts.updateorganizationidisolationpolicy (using)
public.audit_prompts.deleteorganizationidisolationpolicy (using)
public.brand_associations.selectorganizationidisolationpolicy (using)
public.brand_associations.updateorganizationidisolationpolicy (using)
public.brand_associations.deleteorganizationidisolationpolicy (using)
public.brand_mentions.selectorganizationidisolationpolicy (using)
public.brand_mentions.updateorganizationidisolationpolicy (using)
public.brand_mentions.deleteorganizationidisolationpolicy (using)
public.brands.selectorganizationidisolationpolicy (using)
public.brands.updateorganizationidisolationpolicy (using)
public.brands.deleteorganizationidisolationpolicy (using)
public.citation_occurrences.selectorganizationidisolationpolicy (using)
public.citation_occurrences.updateorganizationidisolationpolicy (using)
public.citation_occurrences.deleteorganizationidisolationpolicy (using)
public.citation_sources.selectorganizationidisolationpolicy (using)
public.citation_sources.updateorganizationidisolationpolicy (using)
public.citation_sources.deleteorganizationidisolationpolicy (using)
public.citations.selectorganizationidisolationpolicy (using)
public.citations.updateorganizationidisolationpolicy (using)
public.citations.deleteorganizationidisolationpolicy (using)
public.competitive_analyses.selectorganizationidisolationpolicy (using)
public.competitive_analyses.updateorganizationidisolationpolicy (using)
public.competitive_analyses.deleteorganizationidisolationpolicy (using)
public.competitiveseofindings.selecttenantidisolationpolicy (using)
public.competitiveseofindings.updatetenantidisolationpolicy (using)
public.competitiveseofindings.deletetenantidisolationpolicy (using)
public.competitor_changes.selecttenantidisolationpolicy (using)
public.competitor_changes.updatetenantidisolationpolicy (using)
public.competitor_changes.deletetenantidisolationpolicy (using)
public.competitor_mentions.selectorganizationidisolationpolicy (using)
public.competitor_mentions.updateorganizationidisolationpolicy (using)
public.competitor_mentions.deleteorganizationidisolationpolicy (using)
public.competitors.selectorganizationidisolationpolicy (using)
public.competitors.updateorganizationidisolationpolicy (using)
public.competitors.deleteorganizationidisolationpolicy (using)
public.crawl_cache.crawltenantpolicy (using)
public.crawl_jobs.crawltenantpolicy (using)
public.crawl_results.crawltenantpolicy (using)
public.crawl_snapshots.selectorganizationidisolationpolicy (using)
public.crawl_snapshots.updateorganizationidisolationpolicy (using)
public.crawl_snapshots.deleteorganizationidisolationpolicy (using)
public.credit_transactions.selecttenantidisolationpolicy (using)
public.credit_transactions.updatetenantidisolationpolicy (using)
public.credit_transactions.deletetenantidisolationpolicy (using)
public.diagnosticfindingrelationships.selectorganizationidisolationpolicy (using)
public.diagnosticfindingrelationships.updateorganizationidisolationpolicy (using)
public.diagnosticfindingrelationships.deleteorganizationidisolationpolicy (using)
public.diagnostic_findings.selectorganizationidisolationpolicy (using)
public.diagnostic_findings.updateorganizationidisolationpolicy (using)
public.diagnostic_findings.deleteorganizationidisolationpolicy (using)
public.document_embeddings.selecttenantidisolationpolicy (using)
public.document_embeddings.updatetenantidisolationpolicy (using)
public.document_embeddings.deletetenantidisolationpolicy (using)
public.entities.selectorganizationidisolationpolicy (using)
public.entities.updateorganizationidisolationpolicy (using)
public.entities.deleteorganizationidisolationpolicy (using)
public.entity_relationships.selectorganizationidisolationpolicy (using)
public.entity_relationships.updateorganizationidisolationpolicy (using)
public.entity_relationships.deleteorganizationidisolationpolicy (using)
public.faq_opportunities.selecttenantidisolationpolicy (using)
public.faq_opportunities.updatetenantidisolationpolicy (using)
public.faq_opportunities.deletetenantidisolationpolicy (using)
public.historical_metrics.selectorganizationidisolationpolicy (using)
public.historical_metrics.updateorganizationidisolationpolicy (using)
public.historical_metrics.deleteorganizationidisolationpolicy (using)
public.keywords.selectorganizationidisolationpolicy (using)
public.keywords.updateorganizationidisolationpolicy (using)
public.keywords.deleteorganizationidisolationpolicy (using)
public.kg_alignments.selecttenantidisolationpolicy (using)
public.kg_alignments.updatetenantidisolationpolicy (using)
public.kg_alignments.deletetenantidisolationpolicy (using)
public.kg_entities.selecttenantidisolationpolicy (using)
public.kg_entities.updatetenantidisolationpolicy (using)
public.kg_entities.deletetenantidisolationpolicy (using)
public.kg_relationships.selecttenantidisolationpolicy (using)
public.kg_relationships.updatetenantidisolationpolicy (using)
public.kg_relationships.deletetenantidisolationpolicy (using)
public.monitoring_alerts.selectorganizationidisolationpolicy (using)
public.monitoring_alerts.updateorganizationidisolationpolicy (using)
public.monitoring_alerts.deleteorganizationidisolationpolicy (using)
public.monitoring_configs.selectorganizationidisolationpolicy (using)
public.monitoring_configs.updateorganizationidisolationpolicy (using)
public.monitoring_configs.deleteorganizationidisolationpolicy (using)
public.organization_invitations.selectorganizationidisolationpolicy (using)
public.organization_invitations.updateorganizationidisolationpolicy (using)
public.organization_invitations.deleteorganizationidisolationpolicy (using)
public.organization_members.selectorganizationidisolationpolicy (using)
public.organization_members.updateorganizationidisolationpolicy (using)
public.organization_members.deleteorganizationidisolationpolicy (using)
public.pages.selectorganizationidisolationpolicy (using)
public.pages.updateorganizationidisolationpolicy (using)
public.pages.deleteorganizationidisolationpolicy (using)
public.position_observations.selectorganizationidisolationpolicy (using)
public.position_observations.updateorganizationidisolationpolicy (using)
public.position_observations.deleteorganizationidisolationpolicy (using)
public.premium_audits.selectorganizationidisolationpolicy (using)
public.premium_audits.updateorganizationidisolationpolicy (using)
public.premium_audits.deleteorganizationidisolationpolicy (using)
public.prompt_definitions.selectorganizationidisolationpolicy (using)
public.prompt_definitions.updateorganizationidisolationpolicy (using)
public.prompt_definitions.deleteorganizationidisolationpolicy (using)
public.prompt_executions.selectorganizationidisolationpolicy (using)
public.prompt_executions.updateorganizationidisolationpolicy (using)
public.prompt_executions.deleteorganizationidisolationpolicy (using)
public.prompt_schedules.selectorganizationidisolationpolicy (using)
public.prompt_schedules.updateorganizationidisolationpolicy (using)
public.prompt_schedules.deleteorganizationidisolationpolicy (using)
public.prompts.selectorganizationidisolationpolicy (using)
public.prompts.updateorganizationidisolationpolicy (using)
public.prompts.deleteorganizationidisolationpolicy (using)
public.recommendation_observations.selectorganizationidisolationpolicy (using)
public.recommendation_observations.updateorganizationidisolationpolicy (using)
public.recommendation_observations.deleteorganizationidisolationpolicy (using)
public.recommendations.selectorganizationidisolationpolicy (using)
public.recommendations.updateorganizationidisolationpolicy (using)
public.recommendations.deleteorganizationidisolationpolicy (using)
public.technical_audits.selectorganizationidisolationpolicy (using)
public.technical_audits.updateorganizationidisolationpolicy (using)
public.technical_audits.deleteorganizationidisolationpolicy (using)
public.tenant_quotas.selecttenantidisolationpolicy (using)
public.tenant_quotas.updatetenantidisolationpolicy (using)
public.tenant_quotas.deletetenantidisolationpolicy (using)
public.tenant_subscriptions.selecttenantidisolationpolicy (using)
public.tenant_subscriptions.updatetenantidisolationpolicy (using)
public.tenant_subscriptions.deletetenantidisolationpolicy (using)
public.topics.selectorganizationidisolationpolicy (using)
public.topics.updateorganizationidisolationpolicy (using)
public.topics.deleteorganizationidisolationpolicy (using)
public.visibility_scores.selectorganizationidisolationpolicy (using)
public.visibility_scores.updateorganizationidisolationpolicy (using)
public.visibility_scores.deleteorganizationidisolationpolicy (using)
public.websites.selectorganizationidisolationpolicy (using)
public.websites.updateorganizationidisolationpolicy (using)
public.websites.deleteorganizationidisolationpolicy (using)

--- WithCheck ---
public.aeo_analyses.inserttenantidisolationpolicy (withCheck)
public.aeo_analyses.updatetenantidisolationpolicy (withCheck)
public.ai_observations.insertorganizationidisolationpolicy (withCheck)
public.ai_observations.updateorganizationidisolationpolicy (withCheck)
public.aivisibilityaudits.insertorganizationidisolationpolicy (withCheck)
public.aivisibilityaudits.updateorganizationidisolationpolicy (withCheck)
public.audit_prompts.insertorganizationidisolationpolicy (withCheck)
public.audit_prompts.updateorganizationidisolationpolicy (withCheck)
public.brand_associations.insertorganizationidisolationpolicy (withCheck)
public.brand_associations.updateorganizationidisolationpolicy (withCheck)
public.brand_mentions.insertorganizationidisolationpolicy (withCheck)
public.brand_mentions.updateorganizationidisolationpolicy (withCheck)
public.brands.insertorganizationidisolationpolicy (withCheck)
public.brands.updateorganizationidisolationpolicy (withCheck)
public.citation_occurrences.insertorganizationidisolationpolicy (withCheck)
public.citation_occurrences.updateorganizationidisolationpolicy (withCheck)
public.citation_sources.insertorganizationidisolationpolicy (withCheck)
public.citation_sources.updateorganizationidisolationpolicy (withCheck)
public.citations.insertorganizationidisolationpolicy (withCheck)
public.citations.updateorganizationidisolationpolicy (withCheck)
public.competitive_analyses.insertorganizationidisolationpolicy (withCheck)
public.competitive_analyses.updateorganizationidisolationpolicy (withCheck)
public.competitiveseofindings.inserttenantidisolationpolicy (withCheck)
public.competitiveseofindings.updatetenantidisolationpolicy (withCheck)
public.competitor_changes.inserttenantidisolationpolicy (withCheck)
public.competitor_changes.updatetenantidisolationpolicy (withCheck)
public.competitor_mentions.insertorganizationidisolationpolicy (withCheck)
public.competitor_mentions.updateorganizationidisolationpolicy (withCheck)
public.competitors.insertorganizationidisolationpolicy (withCheck)
public.competitors.updateorganizationidisolationpolicy (withCheck)
public.crawl_cache.crawltenantpolicy (withCheck)
public.crawl_jobs.crawltenantpolicy (withCheck)
public.crawl_results.crawltenantpolicy (withCheck)
public.crawl_snapshots.insertorganizationidisolationpolicy (withCheck)
public.crawl_snapshots.updateorganizationidisolationpolicy (withCheck)
public.credit_transactions.inserttenantidisolationpolicy (withCheck)
public.credit_transactions.updatetenantidisolationpolicy (withCheck)
public.diagnosticfindingrelationships.insertorganizationidisolationpolicy (withCheck)
public.diagnosticfindingrelationships.updateorganizationidisolationpolicy (withCheck)
public.diagnostic_findings.insertorganizationidisolationpolicy (withCheck)
public.diagnostic_findings.updateorganizationidisolationpolicy (withCheck)
public.document_embeddings.inserttenantidisolationpolicy (withCheck)
public.document_embeddings.updatetenantidisolationpolicy (withCheck)
public.entities.insertorganizationidisolationpolicy (withCheck)
public.entities.updateorganizationidisolationpolicy (withCheck)
public.entity_relationships.insertorganizationidisolationpolicy (withCheck)
public.entity_relationships.updateorganizationidisolationpolicy (withCheck)
public.faq_opportunities.inserttenantidisolationpolicy (withCheck)
public.faq_opportunities.updatetenantidisolationpolicy (withCheck)
public.historical_metrics.insertorganizationidisolationpolicy (withCheck)
public.historical_metrics.updateorganizationidisolationpolicy (withCheck)
public.keywords.insertorganizationidisolationpolicy (withCheck)
public.keywords.updateorganizationidisolationpolicy (withCheck)
public.kg_alignments.inserttenantidisolationpolicy (withCheck)
public.kg_alignments.updatetenantidisolationpolicy (withCheck)
public.kg_entities.inserttenantidisolationpolicy (withCheck)
public.kg_entities.updatetenantidisolationpolicy (withCheck)
public.kg_relationships.inserttenantidisolationpolicy (withCheck)
public.kg_relationships.updatetenantidisolationpolicy (withCheck)
public.monitoring_alerts.insertorganizationidisolationpolicy (withCheck)
public.monitoring_alerts.updateorganizationidisolationpolicy (withCheck)
public.monitoring_configs.insertorganizationidisolationpolicy (withCheck)
public.monitoring_configs.updateorganizationidisolationpolicy (withCheck)
public.organization_invitations.insertorganizationidisolationpolicy (withCheck)
public.organization_invitations.updateorganizationidisolationpolicy (withCheck)
public.organization_members.insertorganizationidisolationpolicy (withCheck)
public.organization_members.updateorganizationidisolationpolicy (withCheck)
public.pages.insertorganizationidisolationpolicy (withCheck)
public.pages.updateorganizationidisolationpolicy (withCheck)
public.position_observations.insertorganizationidisolationpolicy (withCheck)
public.position_observations.updateorganizationidisolationpolicy (withCheck)
public.premium_audits.insertorganizationidisolationpolicy (withCheck)
public.premium_audits.updateorganizationidisolationpolicy (withCheck)
public.prompt_definitions.insertorganizationidisolationpolicy (withCheck)
public.prompt_definitions.updateorganizationidisolationpolicy (withCheck)
public.prompt_executions.insertorganizationidisolationpolicy (withCheck)
public.prompt_executions.updateorganizationidisolationpolicy (withCheck)
public.prompt_schedules.insertorganizationidisolationpolicy (withCheck)
public.prompt_schedules.updateorganizationidisolationpolicy (withCheck)
public.prompts.insertorganizationidisolationpolicy (withCheck)
public.prompts.updateorganizationidisolationpolicy (withCheck)
public.recommendation_observations.insertorganizationidisolationpolicy (withCheck)
public.recommendation_observations.updateorganizationidisolationpolicy (withCheck)
public.recommendations.insertorganizationidisolationpolicy (withCheck)
public.recommendations.updateorganizationidisolationpolicy (withCheck)
public.technical_audits.insertorganizationidisolationpolicy (withCheck)
public.technical_audits.updateorganizationidisolationpolicy (withCheck)
public.tenant_quotas.inserttenantidisolationpolicy (withCheck)
public.tenant_quotas.updatetenantidisolationpolicy (withCheck)
public.tenant_subscriptions.inserttenantidisolationpolicy (withCheck)
public.tenant_subscriptions.updatetenantidisolationpolicy (withCheck)
public.topics.insertorganizationidisolationpolicy (withCheck)
public.topics.updateorganizationidisolationpolicy (withCheck)
public.visibility_scores.insertorganizationidisolationpolicy (withCheck)
public.visibility_scores.updateorganizationidisolationpolicy (withCheck)
public.websites.insertorganizationidisolationpolicy (withCheck)
public.websites.updateorganizationidisolationpolicy (withCheck)

0004 INVENTORY

Read-only verification of 0004_rls_isolation.sql confirms:
- PROVEN: Exactly 57 tables receive "ENABLE ROW LEVEL SECURITY". (Derived by grep/parsing ALTER TABLE ... ENABLE ROW LEVEL SECURITY).
- PROVEN: Exactly 228 policies are dropped (DROP POLICY).
- PROVEN: Exactly 228 policies are recreated (CREATE POLICY).
- PROVEN: Exactly four policies correspond to each of the 57 affected tables (57 * 4 = 228).
- PROVEN: The policy definitions map 1:1 to the 4 standard operations (SELECT, INSERT, UPDATE, DELETE) per table.
- PROVEN: A "logical policy" is the combination of table + policy name. The Drizzle snapshot JSON format serializes this as an object where the "policy key" is the top-level property and the "name" is a string property within that object. In 0003_snapshot.json, both the keys and the 'name' properties exhibit underscore stripping corruption.

Regarding "FORCE ROW LEVEL SECURITY":
- PROVEN: Drizzle ORM does not natively serialize "FORCE ROW LEVEL SECURITY" into its snapshot JSON format. Inspection of the 0003_snapshot.json and the Drizzle schema format reveals no 'forceRLS' or equivalent property on the table definitions. It is a Postgres-level command often executed via custom SQL or raw migration strings, but it is INFERRED that it cannot be mechanically derived from the Drizzle JSON snapshot itself because Drizzle's meta format does not model it.

0005 INVENTORY

Read-only verification of 0005_unauthenticated_rate_limits.sql derives the following exact intended Drizzle JSON representation for the "public.unauthenticated_audit_rate_limits" table:

- Table Name: "unauthenticated_audit_rate_limits"
- Schema: "public"
- Columns (6 total):
  1. "identifier":
     - type: "text"
     - primaryKey: true
     - notNull: true
  2. "short_window_start":
     - type: "timestamp with time zone"
     - primaryKey: false
     - notNull: true
     - default: "NOW()" (or standard Drizzle default representation for NOW())
  3. "short_window_count":
     - type: "integer"
     - primaryKey: false
     - notNull: true
     - default: 0
  4. "daily_window_start":
     - type: "timestamp with time zone"
     - primaryKey: false
     - notNull: true
     - default: "NOW()"
  5. "daily_window_count":
     - type: "integer"
     - primaryKey: false
     - notNull: true
     - default: 0
  6. "updated_at":
     - type: "timestamp with time zone"
     - primaryKey: false
     - notNull: true
     - default: "NOW()"
- Primary Key: Composed of ["identifier"] natively on the column, so the "compositePrimaryKeys" object would be empty {}.
- Indexes: {} (None defined in SQL).
- Foreign Keys: {} (None defined in SQL).
- Unique Constraints: {} (None defined in SQL).
- Check Constraints: {} (None defined in SQL).
- Policies: {} (No policies defined in SQL).
- RLS state: Not enabled/forced (No ALTER TABLE ENABLE ROW LEVEL SECURITY).

ADDITIONAL CORRUPTION CHECK

A read-only structural continuity scan was performed comparing 0002_snapshot.json to 0003_snapshot.json. The scan logic iterated over every shared table and column, comparing all property keys and values.

Scan logic rules:
1. Ignore differences where column 'name' in 0003 is the underscore-stripped version of 'name' in 0002.
2. Ignore differences where column 'default' in 0003 contains "genrandomuuid()".
3. Check all other table-level and column-level properties (type, notNull, primaryKey, etc.) for any deviations.

Result: No additional systematic corruption classes were found. Every structural deviation between the historical schema state and the 0003 snapshot is entirely accounted for by the four known corruption classes:
- underscore-stripped column names
- underscore-stripped policy keys/names
- underscore-stripped policy expressions
- "gen_random_uuid()" → "genrandomuuid()"

FILES MODIFIED

NONE.
The repository has been verified to be strictly read-only during this session.
Temporary artifacts were created exclusively outside the repository (in /tmp/forensic).
Package.json modifications from an earlier investigative tool dependency installation have been completely reverted.
Running "git status --porcelain=v1" yields a completely clean working tree. The pre-investigation baseline is exact and intact.

FINAL FORENSIC STATUS

The forensic evidence gathering phase is complete and mathematically reconciled.
No automated repair or snapshot generation was executed.
Awaiting explicit authorization before proceeding to implementation.
