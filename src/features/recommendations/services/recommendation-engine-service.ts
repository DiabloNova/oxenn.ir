import { AutomatedRecommendationRepository } from "../repositories/automated-recommendation-repository";
import { TenantContextManager } from "../../../core/database/tenant-context";
import { MonitoringAlertRepository } from "../../monitoring/repositories/monitoring-alert-repository";
import { createHash } from "crypto";

export class RecommendationEngineService {
  private recommendationRepo = new AutomatedRecommendationRepository();
  private alertRepo = new MonitoringAlertRepository();

  public async runDiagnosisForTenant(tenantId: string, websiteId?: string): Promise<void> {
    await TenantContextManager.runWithTenantContext(tenantId, null, null, async () => {
      // 1. Gather Signals
      // In a real implementation we would fetch competitiveSeoFindings, recent crawlSnapshots, AI visibility changes, etc.
      // Here we will use MonitoringAlerts as a proxy for "What happened" and "Technical SEO observations".

      const ctx = TenantContextManager.getContext();
      const db = (global as unknown as { pgClient?: unknown }).pgClient || ctx?.dbClient;
      if (!db) return;

      // Query open monitoring alerts for this tenant
      const res = await db.query(`
        SELECT * FROM monitoring_alerts
        WHERE organization_id = $1 AND status = 'open'
      `, [tenantId]);

      const alerts = res.rows;

      for (const alert of alerts) {
        await this.processAlertIntoRecommendation(alert, tenantId, websiteId);
      }

      // 2. We can also fetch Competitive SEO Findings to detect "Opportunities"
      const compRes = await db.query(`
        SELECT * FROM competitive_seo_findings
        WHERE organization_id = $1
      `, [tenantId]);

      for (const finding of compRes.rows) {
        await this.processFindingIntoOpportunity(finding, tenantId, websiteId);
      }
    });
  }

  private async processAlertIntoRecommendation(alert: Record<string, unknown>, tenantId: string, websiteId?: string) {
    let priorityScore = 50; // default medium
    if (alert.severity === 'critical') priorityScore = 92;
    else if (alert.severity === 'high') priorityScore = 75;
    else if (alert.severity === 'medium') priorityScore = 51;
    else priorityScore = 34;

    const dedupKey = createHash("sha256").update(`rec-alert-${alert.fingerprint}`).digest("hex");

    const recommendation = {
      organizationId: tenantId,
      websiteId,
      title: `${alert.category} issue detected`,
      description: (alert.message as string) || `An issue of type ${alert.type} was detected.`,
      type: "diagnosis",
      priorityScore,
      status: "pending",
      dedupKey,
      recommendedAction: {
        label: "View Affected Pages",
        actionRef: "technical_seo_report",
        url: alert.url as string | undefined
      }
    };

    await this.recommendationRepo.createOrUpdate(recommendation);

    if (priorityScore >= 80) {
      // It's already an alert in this case, but typically we would fire a notification
      await this.triggerNotification(tenantId, recommendation.title, recommendation.description);
    }
  }

  private async processFindingIntoOpportunity(finding: Record<string, unknown>, tenantId: string, websiteId?: string) {
    let priorityScore = (finding.impact_score as number) || 70;

    // Scale impact score if needed
    if (priorityScore < 30) priorityScore = 35; // ensure it's at least medium if it's an opportunity

    const dedupKey = createHash("sha256").update(`rec-opp-${finding.id}`).digest("hex");

    const findingType = (finding.finding_type as string) || '';
    const title = (finding.title as string) || `Improve ${findingType}`;
    const description = (finding.description as string) || (finding.recommendation as string) || `Competitive opportunity found in ${findingType}`;

    let actionLabel = "View Opportunity";
    let actionRef = "general";
    if (findingType.includes("content")) {
      actionLabel = "Open Content Studio";
      actionRef = "content_studio";
    } else if (findingType.includes("ai")) {
      actionLabel = "View AI Visibility Report";
      actionRef = "ai_visibility";
    }

    const recommendation = {
      organizationId: tenantId,
      websiteId,
      title,
      description,
      type: "opportunity",
      priorityScore,
      status: "pending",
      dedupKey,
      recommendedAction: {
        label: actionLabel,
        actionRef
      }
    };

    await this.recommendationRepo.createOrUpdate(recommendation);

    if (priorityScore >= 80) {
      await this.triggerNotification(tenantId, recommendation.title, recommendation.description);
    }
  }

  private async triggerNotification(tenantId: string, title: string, message: string) {
     // Mock integration with existing alert/notification flow
     console.log(`[Automated Alert] Tenant ${tenantId}: ${title} - ${message}`);
     // In a real implementation:
     // await notificationService.notify({ userId/tenantId, title, message });
  }
}
