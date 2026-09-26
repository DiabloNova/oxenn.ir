"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { Input } from "@/components/Input";
import {
  Tag,
  AlertTriangle,
  CheckCircle,
  Clock,
  Compass,
  FileText,
  Plus,
  Play,
  Settings,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp
} from "lucide-react";
import {
  createPromptDefinitionAction,
  getPromptDefinitionsAction,
  getPromptDetailsAction,
  executeModelComparisonAction,
  schedulePromptAction,
  unschedulePromptAction
} from "@/app/actions/prompt-intelligence";
import { getBrandsAction } from "@/app/actions/ai-visibility-audit";
import {
  Brand,
  PromptDefinition,
  PromptSchedule,
  PromptExecution,
  PositionObservation,
  PromptVariable,
  PromptCategory,
  PromptIntentType
} from "@/features/ai-intelligence/domain/types";

export default function AeoPlaygroundPage() {
  const { language } = useTheme();
  const isRtl = language === "fa";

  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");

  // Library State
  const [definitions, setDefinitions] = useState<PromptDefinition[]>([]);
  const [selectedDef, setSelectedDef] = useState<PromptDefinition | null>(null);
  const [promptDetails, setPromptDetails] = useState<{
    schedule: PromptSchedule | null;
    executions: PromptExecution[];
    positions: PositionObservation[];
  } | null>(null);

  // Form State for creating template
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPromptName, setNewPromptName] = useState("");
  const [newTemplate, setNewTemplate] = useState("");
  const [newCategory, setNewCategory] = useState<PromptCategory>("Brand Discovery");
  const [newIntent, setNewIntent] = useState<PromptIntentType>("Discovery");
  const [newLocale, setNewLocale] = useState("fa");
  const [newCompetitors, setNewCompetitors] = useState("");
  const [newVars, setNewVars] = useState<string>("brand=رشا گستر");
  const [newNotes, setNewNotes] = useState("");

  // Real-time Variables evaluation values
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  // Execution Comparison models selection
  const [selectedModels, setSelectedModels] = useState<string[]>(["sonar-medium"]);

  // Scheduler Form
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [cronExpression, setCronExpression] = useState("0 0 * * *");
  const [timezone, setTimezone] = useState("Asia/Tehran");

  // Comparison Results state
  const [comparisonResults, setComparisonResults] = useState<{
    executions: PromptExecution[];
    positions: Record<string, PositionObservation[]>;
  } | null>(null);

  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Select a prompt template to view details
  const handleSelectPrompt = async (prompt: PromptDefinition) => {
    setSelectedDef(prompt);
    setComparisonResults(null);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Build initial variables values state from defaults
    const initialVals: Record<string, string> = {};
    prompt.variables.forEach(v => {
      initialVals[v.name] = v.defaultValue;
    });
    setVariableValues(initialVals);

    // Fetch executions and schedule
    const res = await getPromptDetailsAction(prompt.id);
    if ("result" in res && res.result) {
      setPromptDetails(res.result);
      if (res.result.schedule) {
        setCronExpression(res.result.schedule.cronExpression);
        setTimezone(res.result.schedule.timezone);
      }
    }
  };

  // Load prompts library
  const loadDefinitions = async (brandId: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    const res = await getPromptDefinitionsAction(brandId);
    if ("result" in res && res.result) {
      setDefinitions(res.result);
      if (res.result.length > 0) {
        handleSelectPrompt(res.result[0]);
      } else {
        setSelectedDef(null);
        setPromptDetails(null);
      }
    } else {
      setErrorMsg(isRtl ? "خطا در بارگذاری قالب‌های پرسش" : "Failed to load prompt templates");
    }
    setIsLoading(false);
  };

  // Load brands on mount
  useEffect(() => {
    async function loadBrands() {
      setIsLoading(true);
      const res = await getBrandsAction();
      if ("result" in res && res.result && res.result.length > 0) {
        setBrands(res.result);
        setSelectedBrandId(res.result[0].id);
        loadDefinitions(res.result[0].id);
      } else if (!res.success) {
        setErrorMsg(isRtl ? "خطا در بارگذاری برندهای فعال" : "Failed to load tenant brands");
        setIsLoading(false);
      }
    }
    loadBrands();
  }, [isRtl]);

  // Trigger single execution or comparison
  const runComparison = () => {
    if (!selectedDef) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setComparisonResults(null);

    startTransition(async () => {
      // Trigger execution against selected models
      const res = await executeModelComparisonAction({
        promptId: selectedDef.id,
        variablesValues: variableValues,
        models: selectedModels
      });

      if ("result" in res && res.result) {
        setComparisonResults(res.result);
        setSuccessMsg(isRtl ? "پاسخ مدل‌ها با موفقیت دریافت و آنالیز شد." : "Model responses compiled and analyzed successfully.");

        // Reload details to refresh history list
        const detailsRes = await getPromptDetailsAction(selectedDef.id);
        if ("result" in detailsRes && detailsRes.result) {
          setPromptDetails(detailsRes.result);
        }
      } else if ("error" in res && res.error) {
        setErrorMsg(res.error);
      } else if (!res.success) {
        setErrorMsg(isRtl ? "خطا در برقراری ارتباط با مدل‌ها." : "Error communicating with models.");
      }
    });
  };

  // Create prompt template handler
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptName || !newTemplate) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    // Parse variables (format: name=default, name2=default)
    const varsArray: PromptVariable[] = newVars.split(",").map(part => {
      const [name, def] = part.split("=");
      return {
        name: name ? name.trim() : "",
        defaultValue: def ? def.trim() : "",
        description: isRtl ? "متغیر قالب پرسش" : "Template variable value"
      };
    }).filter(v => v.name !== "");

    // Parse competitors (format: comp1, comp2)
    const compsArray = newCompetitors.split(",").map(c => c.trim()).filter(c => c !== "");

    startTransition(async () => {
      const res = await createPromptDefinitionAction({
        brandId: selectedBrandId,
        name: newPromptName,
        promptTemplate: newTemplate,
        category: newCategory,
        intent: newIntent,
        locale: newLocale,
        variables: varsArray,
        competitors: compsArray,
        tags: ["custom"],
        notes: newNotes
      });

      if ("result" in res && res.result) {
        setShowCreateModal(false);
        setSuccessMsg(isRtl ? "قالب جدید با موفقیت به کتابخانه اضافه شد." : "New template added to library.");

        // Reset form fields
        setNewPromptName("");
        setNewTemplate("");
        setNewCompetitors("");
        setNewNotes("");

        // Reload list
        loadDefinitions(selectedBrandId);
      } else if ("error" in res && res.error) {
        setErrorMsg(res.error);
      } else if (!res.success) {
        setErrorMsg("Failed to create prompt template");
      }
    });
  };

  // Configure Schedule handler
  const handleSaveSchedule = async () => {
    if (!selectedDef) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await schedulePromptAction({
        promptId: selectedDef.id,
        cronExpression,
        timezone
      });

      if ("result" in res && res.result) {
        setSuccessMsg(isRtl ? "زمان‌بندی پایش با موفقیت ذخیره شد." : "Schedule updated successfully.");
        setShowSchedulePanel(false);

        // Refresh details
        const detailsRes = await getPromptDetailsAction(selectedDef.id);
        if ("result" in detailsRes && detailsRes.result) {
          setPromptDetails(detailsRes.result);
        }
      } else if ("error" in res && res.error) {
        setErrorMsg(res.error);
      } else if (!res.success) {
        setErrorMsg("Failed to save schedule");
      }
    });
  };

  // Disable Schedule
  const handleDisableSchedule = async () => {
    if (!selectedDef) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await unschedulePromptAction({ promptId: selectedDef.id });
      if (res.success) {
        setSuccessMsg(isRtl ? "زمان‌بندی با موفقیت متوقف شد." : "Schedule disabled successfully.");

        // Refresh details
        const detailsRes = await getPromptDetailsAction(selectedDef.id);
        if ("result" in detailsRes && detailsRes.result) {
          setPromptDetails(detailsRes.result);
        }
      } else if ("error" in res && res.error) {
        setErrorMsg(res.error);
      } else if (!res.success) {
        setErrorMsg("Failed to disable schedule");
      }
    });
  };

  // Toggle model selection
  const toggleModel = (model: string) => {
    if (selectedModels.includes(model)) {
      if (selectedModels.length > 1) {
        setSelectedModels(selectedModels.filter(m => m !== model));
      }
    } else {
      setSelectedModels([...selectedModels, model]);
    }
  };

  // Load audit details when brand selection changes
  const handleBrandChange = async (brandId: string) => {
    setSelectedBrandId(brandId);
    setErrorMsg(null);
    setSuccessMsg(null);
    loadDefinitions(brandId);
  };

  return (
    <div className="space-y-6 animate-fade-in text-start pbe-10">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border)] pbe-5">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] font-display flex items-center gap-2.5">
            <Layers className="text-[var(--sky-blue-500)]" size={24} />
            <span>{isRtl ? "استودیو هوشمند پرامپت (Prompt Intelligence)" : "Prompt Intelligence Studio"}</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mbs-1.5 max-w-2xl leading-relaxed">
            {isRtl
              ? "ابزار پیشرفته مدیریت، قالب‌سازی متغیرها، مقایسه همزمان پاسخ مدل‌های هوشمند و ردیابی رتبه‌بندی کلامی برند شما در برابر رقبا."
              : "Enterprise prompt laboratory to parameterize templates, compare semantic models, schedule cron audits, and trace brand-vs-competitor ranks."}
          </p>
        </div>

        {/* Brand selection */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <select
              value={selectedBrandId}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] text-xs text-[var(--text-primary)] focus:outline-none font-semibold"
              disabled={isLoading || isPending}
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={() => setShowCreateModal(true)}
            variant="primary"
            size="sm"
            className="text-xs font-black"
          >
            <Plus size={14} />
            <span>{isRtl ? "خلق قالب پرسش" : "Create Template"}</span>
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-[var(--color-error-bg)] border border-[color-mix(in_srgb,var(--color-error)_30%,transparent)] rounded-lg text-xs text-[var(--color-error)] flex items-center gap-2 font-semibold">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-[var(--color-success-bg)] border border-[color-mix(in_srgb,var(--color-success)_30%,transparent)] rounded-lg text-xs text-[var(--color-success)] flex items-center gap-2 font-semibold animate-pulse">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid: Prompts Library list on left, Playground/Details on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Library list */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="border border-[var(--border)] bg-[var(--card)] rounded-xl">
            <CardHeader className="border-b border-[var(--border)]/50 pbe-3.5">
              <CardTitle className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider">
                {isRtl ? "کتابخانه پرامپت‌های برند" : "Prompt Library"}
              </CardTitle>
              <CardDescription className="text-[10px]">
                {isRtl ? "قالب‌های ثبت شده با نسخه‌بندی قطعی" : "Historically versioned templates snapshot list"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 space-y-1 divide-y divide-[var(--border)]/20">
              {definitions.length === 0 ? (
                <div className="p-4 text-center text-xs text-[var(--text-muted)] italic">
                  {isRtl ? "هیچ قالبی تعریف نشده است." : "Library is empty."}
                </div>
              ) : (
                definitions.map((def) => (
                  <div
                    key={def.id}
                    onClick={() => handleSelectPrompt(def)}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 text-start flex justify-between items-start gap-2 ${selectedDef?.id === def.id ? "bg-[var(--sky-blue-500)]/10 border-l-2 border-[var(--sky-blue-500)]" : "hover:bg-[var(--border)]/20"}`}
                  >
                    <div className="space-y-1 flex-grow">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[var(--text-primary)] line-clamp-1">
                          {def.name}
                        </span>
                        <span className="text-[8px] font-mono px-1 py-0.2 bg-[var(--border)] rounded font-semibold text-[var(--text-muted)]">
                          v{def.version}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] line-clamp-1 italic font-mono">
                        {def.promptTemplate}
                      </p>
                      <div className="flex items-center gap-2 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        <span>{def.category}</span>
                        <span>•</span>
                        <span>{def.intent}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-[var(--text-muted)] mt-1 shrink-0" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Playground/Execution section */}
        <div className="lg:col-span-2 space-y-6">
          {selectedDef ? (
            <div className="space-y-6">

              {/* Template details card */}
              <Card className="border border-[var(--border)] bg-[var(--card)] rounded-xl">
                <CardHeader className="border-b border-[var(--border)]/50 pbe-4 flex flex-row justify-between items-start">
                  <div>
                    <CardTitle className="text-sm font-black text-[var(--text-primary)]">
                      {selectedDef.name}
                    </CardTitle>
                    <CardDescription className="text-xs font-mono">
                      {isRtl ? "نسخه فعال پرامپت: " : "Active Immutable Version: "} v{selectedDef.version}
                    </CardDescription>
                  </div>

                  {/* Scheduled state badge */}
                  <div className="flex items-center gap-2">
                    {promptDetails?.schedule?.enabled ? (
                      <Badge variant="success" className="text-[9px] font-bold px-2 py-0.5">
                        {isRtl ? "فعال در زمان‌بندی" : "Scheduled"}
                      </Badge>
                    ) : (
                      <Badge variant="neutral" className="text-[9px] font-bold px-2 py-0.5">
                        {isRtl ? "بدون زمان‌بندی" : "On-Demand"}
                      </Badge>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSchedulePanel(!showSchedulePanel)}
                      className="p-1 h-auto cursor-pointer"
                      title={isRtl ? "تنظیم زمان‌بندی" : "Configure Schedule"}
                    >
                      <Settings size={14} />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="py-5 space-y-4 text-xs">
                  {/* Cron Scheduler Setting Form */}
                  {showSchedulePanel && (
                    <div className="p-4 bg-[var(--border)]/20 rounded-xl space-y-3 border border-[var(--border)]/40">
                      <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <Calendar size={14} className="text-[var(--sky-blue-500)]" />
                        {isRtl ? "تنظیمات زمان‌بندی خودکار" : "Configure Automated Cron Schedule"}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Input
                            label={isRtl ? "عبارت کرون (Cron Expression)" : "Cron Expression"}
                            type="text"
                            value={cronExpression}
                            onChange={(e) => setCronExpression(e.target.value)}
                            placeholder="e.g. 0 0 * * *"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-[var(--text-secondary)] mbe-1.5 block">
                            {isRtl ? "منطقه زمانی" : "Timezone"}
                          </label>
                          <select
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--text-primary)] font-semibold"
                          >
                            <option value="Asia/Tehran">Asia/Tehran</option>
                            <option value="UTC">UTC</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pbs-1">
                        {promptDetails?.schedule?.enabled && (
                          <Button
                            onClick={handleDisableSchedule}
                            variant="danger"
                            size="sm"
                            className="text-[10px] font-black"
                          >
                            {isRtl ? "توقف پایش" : "Disable Schedule"}
                          </Button>
                        )}
                        <Button
                          onClick={handleSaveSchedule}
                          variant="primary"
                          size="sm"
                          className="text-[10px] font-black"
                        >
                          {isRtl ? "ذخیره زمان‌بندی" : "Save Schedule"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Template text */}
                  <div className="space-y-1.5 text-start">
                    <span className="font-bold text-[var(--text-primary)] flex items-center gap-1">
                      <FileText size={14} className="text-[var(--sky-blue-500)]" />
                      {isRtl ? "قالب پرامپت (پایه متغیر)" : "Prompt Template"}
                    </span>
                    <div className="p-3 bg-[var(--border)]/20 border border-[var(--border)] rounded-lg text-start font-mono leading-relaxed select-all">
                      {selectedDef.promptTemplate}
                    </div>
                  </div>

                  {/* Variable values inputs */}
                  {selectedDef.variables.length > 0 && (
                    <div className="space-y-3 text-start">
                      <span className="font-bold text-[var(--text-primary)] flex items-center gap-1">
                        <Tag size={14} className="text-[var(--sky-blue-500)]" />
                        {isRtl ? "مقداردهی به متغیرها" : "Assign Variable Values"}
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedDef.variables.map((v) => (
                          <div key={v.name}>
                            <Input
                              label={v.name}
                              type="text"
                              value={variableValues[v.name] || ""}
                              onChange={(e) => setVariableValues({ ...variableValues, [v.name]: e.target.value })}
                              required
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Competitors list show */}
                  {selectedDef.competitors.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pbs-1 text-start">
                      <span className="font-bold text-[var(--text-muted)] me-1">
                        {isRtl ? "رقبای تنظیم شده:" : "Target Competitors:"}
                      </span>
                      {selectedDef.competitors.map((c, idx) => (
                        <Badge key={idx} variant="neutral" className="text-[10px] font-semibold">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Model Comparison settings & execution */}
              <Card className="border border-[var(--border)] bg-[var(--card)] rounded-xl">
                <CardHeader className="border-b border-[var(--border)]/50 pbe-3">
                  <CardTitle className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                    <Compass size={14} className="text-[var(--sky-blue-500)]" />
                    <span>{isRtl ? "مقایسه همزمان مدل‌ها" : "Model Comparison Matrix"}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-4 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-bold text-[var(--text-secondary)]">
                      {isRtl ? "انتخاب مدل‌ها:" : "Select Models:"}
                    </span>
                    {["sonar-medium", "gemini-1.5-flash", "gemini-1.5-pro"].map((m) => (
                      <Button
                        key={m}
                        onClick={() => toggleModel(m)}
                        variant={selectedModels.includes(m) ? "outline" : "ghost"}
                        size="sm"
                        className={`text-[10px] font-black ${selectedModels.includes(m) ? "border-[var(--sky-blue-500)] text-[var(--sky-blue-500)]" : ""}`}
                      >
                        {m}
                      </Button>
                    ))}
                  </div>

                  <Button
                    onClick={runComparison}
                    disabled={isPending || selectedModels.length === 0}
                    variant="primary"
                    size="md"
                    className="w-full text-xs font-black"
                  >
                    <Play size={14} className={isPending ? "animate-spin" : ""} />
                    <span>{isRtl ? "اجرای مقایسه همزمان" : "Execute Model Comparison"}</span>
                  </Button>
                </CardContent>
              </Card>

              {/* Comparison Results Area */}
              {comparisonResults && (
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-[var(--text-primary)] flex items-center gap-2">
                    <TrendingUp size={16} className="text-[var(--sky-blue-500)]" />
                    <span>{isRtl ? "نتایج مقایسه همزمان" : "Comparison Matrix Results"}</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {comparisonResults.executions.map((exec) => {
                      const positionsList = comparisonResults.positions[exec.id] || [];

                      return (
                        <Card key={exec.id} className="border border-[var(--border)] bg-[var(--card)] rounded-xl flex flex-col justify-between overflow-hidden">
                          <div className="p-4 border-b border-[var(--border)]/50 bg-[var(--border)]/10 flex justify-between items-center text-xs font-black">
                            <span className="text-[var(--text-primary)]">{exec.model}</span>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono flex items-center gap-1">
                              <Clock size={12} />
                              {exec.latencyMs ? `${exec.latencyMs}ms` : "-"}
                            </span>
                          </div>

                          <div className="p-4 flex-grow space-y-4 text-xs">
                            {/* Positions Panel */}
                            <div className="space-y-2">
                              <span className="font-bold text-[var(--text-primary)] block">
                                {isRtl ? "رتبه‌بندی کلامی کشف شده:" : "Extracted Semantic Rankings:"}
                              </span>

                              {positionsList.length > 0 ? (
                                <div className="space-y-2">
                                  {positionsList.map((pos) => (
                                    <div key={pos.id} className="p-2.5 bg-[var(--border)]/20 border border-[var(--border)]/40 rounded-lg">
                                      <div className="flex justify-between items-center text-[11px] font-bold">
                                        <span className="text-[var(--text-primary)]">{pos.subjectEntityId}</span>
                                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-black ${pos.presence === "ranked" || pos.presence === "recommended" ? "bg-emerald-50 text-emerald-500 border border-emerald-100" : "bg-[var(--border)] text-[var(--text-muted)]"}`}>
                                          {pos.presence === "ranked" ? `${isRtl ? "رتبه " : "Rank "}${pos.numericPosition}` : pos.presence}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed italic mbs-1.5 border-t border-[var(--border)]/10 pbs-1.5 font-mono">
                                        &quot;{pos.evidenceExcerpt}&quot;
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] text-[var(--text-muted)] italic">
                                  {isRtl ? "هیچ موقعیت رتبه‌بندی استخراج نشد." : "No semantic ranking structures extracted."}
                                </p>
                              )}
                            </div>

                            {/* Raw AI Response text */}
                            <div className="space-y-1.5">
                              <span className="font-bold text-[var(--text-primary)] block">
                                {isRtl ? "پاسخ خام مدل:" : "Raw Model Response:"}
                              </span>
                              <div className="p-3 bg-[var(--border)]/5 border border-[var(--border)]/30 rounded-lg text-[10px] font-mono leading-relaxed line-clamp-4 overflow-y-auto whitespace-pre-wrap select-all">
                                {exec.responseText}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[var(--text-muted)] italic">
              {isRtl ? "یکی از قالب‌های پرسش را انتخاب کنید." : "Select a template from library to enter playground."}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Template Form */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl border border-[var(--border)] bg-[var(--card)] rounded-xl shadow-xl overflow-hidden animate-scale-in">
            <CardHeader className="border-b border-[var(--border)]/50 pbe-4">
              <CardTitle className="text-sm font-black text-[var(--text-primary)]">
                {isRtl ? "تعریف قالب پرسش جدید" : "Create Prompt Template"}
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleCreateTemplate} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label={isRtl ? "نام قالب" : "Template Title"}
                    type="text"
                    value={newPromptName}
                    onChange={(e) => setNewPromptName(e.target.value)}
                    placeholder="e.g. سهم صدای برند کلی"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)] mbe-1.5 block">
                    {isRtl ? "زبان" : "Locale"}
                  </label>
                  <select
                    value={newLocale}
                    onChange={(e) => setNewLocale(e.target.value)}
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--text-primary)] font-semibold"
                  >
                    <option value="fa">فارسی (fa)</option>
                    <option value="en">English (en)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)] block">
                  {isRtl ? "قالب پرامپت (به همراه متغیرها در آکولاد)" : "Prompt Template text"}
                </label>
                <textarea
                  value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value)}
                  placeholder="e.g. معرفی کامل برند {brand} چیست؟"
                  rows={3}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--text-primary)] font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)] mbe-1.5 block">
                    {isRtl ? "دسته‌بندی (Category)" : "Category"}
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as PromptCategory)}
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--text-primary)] font-semibold"
                  >
                    <option value="Brand Discovery">Brand Discovery</option>
                    <option value="Product/Service Discovery">Product/Service Discovery</option>
                    <option value="Category">Category</option>
                    <option value="Recommendation">Recommendation</option>
                    <option value="Comparison">Comparison</option>
                    <option value="Problem/Solution">Problem/Solution</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)] mbe-1.5 block">
                    {isRtl ? "هدف خریدار (Intent)" : "Intent"}
                  </label>
                  <select
                    value={newIntent}
                    onChange={(e) => setNewIntent(e.target.value as PromptIntentType)}
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--text-primary)] font-semibold"
                  >
                    <option value="Discovery">Discovery</option>
                    <option value="Comparison">Comparison</option>
                    <option value="Recommendation">Recommendation</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Research">Research</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label={isRtl ? "تعریف متغیرها (فرمت: name=default)" : "Variables (format: name=default)"}
                    type="text"
                    value={newVars}
                    onChange={(e) => setNewVars(e.target.value)}
                    placeholder="e.g. brand=رشا گستر, location=تهران"
                  />
                </div>
                <div>
                  <Input
                    label={isRtl ? "رقبای پایش (با کاما جدا کنید)" : "Competitors (comma separated)"}
                    type="text"
                    value={newCompetitors}
                    onChange={(e) => setNewCompetitors(e.target.value)}
                    placeholder="e.g. CompetitorA, CompetitorB"
                  />
                </div>
              </div>

              <div>
                <Input
                  label={isRtl ? "یادداشت‌ها" : "Notes"}
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="..."
                />
              </div>

              <div className="flex gap-2 justify-end pbs-3 border-t border-[var(--border)]/50">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  {isRtl ? "انصراف" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  variant="primary"
                  size="sm"
                >
                  {isRtl ? "افزودن به کتابخانه" : "Add Template"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
