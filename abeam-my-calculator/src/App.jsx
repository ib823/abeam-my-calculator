import React, { useMemo, useState, useEffect } from "react";

/* ---------- Enhanced Data Structures ---------- */
const SG_CAPS = [
  { key: "gl_aa_payments_open", label: "GL / AA / Payments / Open-Item", days: 193, category: "core" },
  { key: "p2p_inv_acct", label: "Procurement & Inventory Accounting", days: 90, category: "core" },
  { key: "local_close_analytics", label: "Local Close & Analytics", days: 39, category: "reporting" },
  { key: "drc_tax", label: "DRC + Tax Setup", days: 26, category: "compliance" },
  { key: "collections", label: "Collections Management", days: 26, category: "finance" },
  { key: "credit", label: "Credit Management", days: 26, category: "finance" },
  { key: "sales_service", label: "Sales & Service Accounting", days: 77, category: "core" },
  { key: "overhead_prod_margin", label: "Overhead / Production / Margin", days: 103, category: "manufacturing" },
  { key: "lease", label: "Lease Accounting", days: 64, category: "advanced" },
  { key: "cash_mgmt", label: "Cash Management & Liquidity", days: 51, category: "finance" },
  { key: "trade_comp", label: "Trade Compliance", days: 64, category: "compliance" },
];

const DEFAULT_MY_MULTIPLIERS = Object.fromEntries(SG_CAPS.map(c => [c.key, 1]));

const FORMS = [
  { key: "tax_invoice", label: "Tax Invoice", days: 4, priority: "high", malaysiaSpecific: true },
  { key: "credit_note", label: "Credit Note", days: 3, priority: "high", malaysiaSpecific: false },
  { key: "debit_note", label: "Debit Note", days: 3, priority: "medium", malaysiaSpecific: false },
  { key: "purchase_order", label: "Purchase Order", days: 4, priority: "high", malaysiaSpecific: true },
  { key: "payment_advice", label: "Payment Advice", days: 2, priority: "medium", malaysiaSpecific: true },
  { key: "wht_cert", label: "Withholding Tax Certificate", days: 3, priority: "high", malaysiaSpecific: true },
  { key: "delivery_note", label: "Delivery Note", days: 3, priority: "medium", malaysiaSpecific: false },
  { key: "grn", label: "Goods Receipt Note", days: 2, priority: "medium", malaysiaSpecific: false },
  { key: "remittance", label: "Remittance Advice", days: 2, priority: "low", malaysiaSpecific: true },
  { key: "soa", label: "Statement of Account", days: 3, priority: "medium", malaysiaSpecific: false },
];

const INTERFACES = [
  { key: "if_payroll_fi", label: "HR/Payroll → FI Posting", days: 5, complexity: "medium" },
  { key: "if_open_items", label: "Legacy AR/AP Open-Items Upload", days: 5, complexity: "low" },
  { key: "if_bank_export", label: "Bank Export File (payment)", days: 5, complexity: "medium" },
  { key: "if_sst_reporting", label: "SST Reporting to LHDN", days: 8, complexity: "high" },
  { key: "if_epf_socso", label: "EPF/SOCSO Integration", days: 6, complexity: "medium" },
];

const INDUSTRY_TEMPLATES = {
  electronics: {
    name: "Electronics Manufacturing",
    multipliers: { gl_aa_payments_open: 1.1, overhead_prod_margin: 1.2, trade_comp: 1.3 },
    requiredForms: ['tax_invoice', 'purchase_order', 'delivery_note', 'grn'],
    requiredInterfaces: ['if_payroll_fi', 'if_bank_export'],
    additionalDays: 15,
    description: "Optimized for electronics manufacturing with export compliance"
  },
  foodProcessing: {
    name: "Food Processing",
    multipliers: { overhead_prod_margin: 1.3, trade_comp: 1.4, collections: 1.1 },
    requiredForms: ['tax_invoice', 'purchase_order', 'delivery_note', 'grn', 'soa'],
    requiredInterfaces: ['if_payroll_fi', 'if_sst_reporting'],
    additionalDays: 20,
    description: "Includes HACCP compliance and Halal certification workflows"
  },
  automotive: {
    name: "Automotive Parts",
    multipliers: { gl_aa_payments_open: 1.15, overhead_prod_margin: 1.25, sales_service: 1.1 },
    requiredForms: ['tax_invoice', 'purchase_order', 'delivery_note', 'grn', 'wht_cert'],
    requiredInterfaces: ['if_payroll_fi', 'if_bank_export', 'if_open_items'],
    additionalDays: 18,
    description: "Just-in-time inventory and quality management focus"
  },
  general: {
    name: "General Manufacturing",
    multipliers: {},
    requiredForms: ['tax_invoice', 'purchase_order', 'payment_advice'],
    requiredInterfaces: ['if_payroll_fi'],
    additionalDays: 10,
    description: "Standard manufacturing processes"
  }
};

const RISK_FACTORS = {
  clientType: { new: 1.15, existing: 1.0, returning: 0.95 },
  migration: { greenfield: 1.0, eccMigration: 1.25, legacyMigration: 1.35 },
  timeline: { standard: 1.0, aggressive: 1.3, relaxed: 0.9 },
  complexity: { simple: 0.9, standard: 1.0, complex: 1.2, veryComplex: 1.4 }
};

const COMPETITOR_BENCHMARKS = {
  cbs: { name: "CBS", typicalDiscount: 15, marketPosition: "aggressive" },
  nttData: { name: "NTT Data", typicalDiscount: 12, marketPosition: "competitive" },
  deloitte: { name: "Deloitte", typicalDiscount: 5, marketPosition: "premium" },
  local: { name: "Local Integrators", typicalDiscount: 25, marketPosition: "budget" }
};

const TECH = { migrationPerCycle: 20 };
const AMS_CHOICES = [
  { key: "ams30", label: "AMS 30d/year (3y)", daysPerYear: 30 },
  { key: "ams40", label: "AMS 40d/year (3y)", daysPerYear: 40 },
  { key: "ams50", label: "AMS 50d/year (3y)", daysPerYear: 50 },
];

/* ---------- Enhanced Helpers ---------- */
const Num = ({ value }) => <span className="font-mono">{Number(value).toLocaleString()}</span>;
const Toggle = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-11 h-6 rounded-full p-0.5 transition ${checked ? "bg-blue-600" : "bg-slate-300"}`}
  >
    <div className={`h-5 w-5 bg-white rounded-full shadow transition ${checked ? "translate-x-5" : ""}`} />
  </button>
);

const PriorityBadge = ({ priority }) => {
  const colors = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200", 
    low: "bg-green-100 text-green-800 border-green-200"
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full border ${colors[priority]}`}>
      {priority}
    </span>
  );
};

/* ---------- UI Components ---------- */
function Card({ title, subtitle, children, footer, className = "" }) {
  return (
    <section className={`bg-white border border-slate-200 rounded-2xl shadow-sm ${className}`}>
      {(title || subtitle) && (
        <div className="px-6 pt-5">
          {title && <h2 className="text-lg font-semibold text-slate-800">{title}</h2>}
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="p-6 pt-4">{children}</div>
      {footer && <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">{footer}</div>}
    </section>
  );
}

function CheckboxRow({ checked, onChange, left, right, priority }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 hover:bg-slate-50">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="text-sm text-slate-800">{left}</span>
        {priority && <PriorityBadge priority={priority} />}
      </div>
      {right && <span className="text-xs text-slate-500">{right}</span>}
    </label>
  );
}

function ExportButton({ data, filename }) {
  const exportToJSON = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={exportToJSON}
      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
    >
      📄 Export Config
    </button>
  );
}

/* =============================== Main App =============================== */
export default function App() {
  /* Core State */
  const [mode, setMode] = useState("guided");
  const [tier, setTier] = useState("essential");
  const [industryTemplate, setIndustryTemplate] = useState("general");

  /* Functional */
  const [selectedCaps, setSelectedCaps] = useState(new Set(["gl_aa_payments_open", "p2p_inv_acct", "local_close_analytics"]));
  const [includeDRC, setIncludeDRC] = useState(false);
  const [myMultipliers, setMyMultipliers] = useState(DEFAULT_MY_MULTIPLIERS);

  /* FRICEW */
  const [selectedForms, setSelectedForms] = useState(new Set(["tax_invoice","credit_note","debit_note","purchase_order","payment_advice","wht_cert"]));
  const [selectedIfs, setSelectedIfs] = useState(new Set());

  /* Technical & Wrapper */
  const [securityDays, setSecurityDays] = useState(20);
  const [tenantOpsDays, setTenantOpsDays] = useState(15);
  const [migrationCycles, setMigrationCycles] = useState(2);
  const [pmoDays, setPmoDays] = useState(55);
  const [cutoverDays, setCutoverDays] = useState(12);
  const [trainingDays, setTrainingDays] = useState(15);
  const [hypercareDays, setHypercareDays] = useState(15);

  /* Risk Factors */
  const [clientType, setClientType] = useState("existing");
  const [migrationType, setMigrationType] = useState("greenfield");
  const [timelineType, setTimelineType] = useState("standard");
  const [complexityLevel, setComplexityLevel] = useState("standard");

  /* Commercial */
  const [sgRate, setSgRate] = useState(700);
  const [fx, setFx] = useState(3.4);
  const [myRate, setMyRate] = useState(2000);
  const [amsRate, setAmsRate] = useState(1900);
  const [allowMandayDiscount, setAllowMandayDiscount] = useState(true);
  const [mandayDiscountPct, setMandayDiscountPct] = useState(0);
  const [rateDiscountPct, setRateDiscountPct] = useState(0);

  /* Team Structure */
  const [teamSize, setTeamSize] = useState(5);
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState(5);

  /* Competitor Comparison */
  const [competitorPrices, setCompetitorPrices] = useState({
    cbs: 0, nttData: 0, deloitte: 0, local: 0
  });

  /* AMS */
  const [selectedAMS, setSelectedAMS] = useState(null);
  const [amsDiscountPct, setAmsDiscountPct] = useState(15);

  /* Industry Template Application */
  const applyIndustryTemplate = (template) => {
    setIndustryTemplate(template);
    const config = INDUSTRY_TEMPLATES[template];
    
    // Apply multipliers
    const newMultipliers = { ...DEFAULT_MY_MULTIPLIERS };
    Object.entries(config.multipliers).forEach(([key, multiplier]) => {
      newMultipliers[key] = multiplier;
    });
    setMyMultipliers(newMultipliers);
    
    // Apply required forms and interfaces
    setSelectedForms(new Set(config.requiredForms));
    setSelectedIfs(new Set(config.requiredInterfaces));
  };

  /* Guided Presets */
  const applyTier = (t) => {
    setTier(t);
    if (t === "essential") {
      setSelectedCaps(new Set(["gl_aa_payments_open","p2p_inv_acct","local_close_analytics"]));
      setIncludeDRC(false);
      setSelectedForms(new Set(["tax_invoice","credit_note","debit_note","purchase_order","payment_advice","wht_cert"]));
      setSelectedIfs(new Set());
      setSecurityDays(20); setTenantOpsDays(15); setMigrationCycles(2);
      setPmoDays(55); setCutoverDays(12); setTrainingDays(15); setHypercareDays(15);
    }
    if (t === "standard") {
      setSelectedCaps(new Set(["gl_aa_payments_open","p2p_inv_acct","local_close_analytics","collections","credit","sales_service"]));
      setIncludeDRC(true);
      setSelectedForms(new Set(["tax_invoice","credit_note","debit_note","purchase_order","payment_advice","wht_cert","delivery_note","grn"]));
      setSelectedIfs(new Set(["if_payroll_fi","if_open_items"]));
      setSecurityDays(20); setTenantOpsDays(20); setMigrationCycles(3);
      setPmoDays(65); setCutoverDays(15); setTrainingDays(20); setHypercareDays(20);
    }
    if (t === "premium") {
      setSelectedCaps(new Set(["gl_aa_payments_open","p2p_inv_acct","local_close_analytics","collections","credit","sales_service","overhead_prod_margin","lease","cash_mgmt","trade_comp"]));
      setIncludeDRC(true);
      setSelectedForms(new Set(FORMS.map(f=>f.key)));
      setSelectedIfs(new Set(["if_payroll_fi","if_open_items","if_bank_export"]));
      setSecurityDays(25); setTenantOpsDays(25); setMigrationCycles(3);
      setPmoDays(75); setCutoverDays(18); setTrainingDays(25); setHypercareDays(25);
    }
  };

  useEffect(() => { if (mode === "guided") applyTier(tier) }, [mode, tier]);

  /* Enhanced Calculations */
  const sgSelected = useMemo(() => SG_CAPS.filter(c => selectedCaps.has(c.key)), [selectedCaps]);
  
  const sgFunctionalDays = useMemo(() => {
    let base = sgSelected.reduce((a, c) => a + c.days, 0);
    if (includeDRC && !selectedCaps.has("drc_tax")) base += SG_CAPS.find(c => c.key === "drc_tax").days;
    return base;
  }, [sgSelected, includeDRC, selectedCaps]);
  
  const sgFunctionalPriceMYR = useMemo(() => sgFunctionalDays * sgRate * fx, [sgFunctionalDays, sgRate, fx]);

  const myFunctionalDays = useMemo(() => {
    let total = 0;
    sgSelected.forEach(c => total += c.days * (myMultipliers[c.key] ?? 1));
    if (includeDRC && !selectedCaps.has("drc_tax")) total += SG_CAPS.find(c => c.key === "drc_tax").days * (myMultipliers["drc_tax"] ?? 1);
    
    // Add industry template additional days
    const templateConfig = INDUSTRY_TEMPLATES[industryTemplate];
    total += templateConfig.additionalDays;
    
    return Math.round(total);
  }, [sgSelected, includeDRC, selectedCaps, myMultipliers, industryTemplate]);

  const formsDays = useMemo(() => FORMS.filter(f => selectedForms.has(f.key)).reduce((a, b) => a + b.days, 0), [selectedForms]);
  const ifDays = useMemo(() => INTERFACES.filter(i => selectedIfs.has(i.key)).reduce((a, b) => a + b.days, 0), [selectedIfs]);
  const technicalDays = securityDays + tenantOpsDays + migrationCycles * TECH.migrationPerCycle;
  const wrapperDays = pmoDays + cutoverDays + trainingDays + hypercareDays;

  const myTotalMandaysRaw = myFunctionalDays + formsDays + ifDays + technicalDays + wrapperDays;
  
  // Apply risk factors
  const riskMultiplier = RISK_FACTORS.clientType[clientType] * 
                       RISK_FACTORS.migration[migrationType] * 
                       RISK_FACTORS.timeline[timelineType] * 
                       RISK_FACTORS.complexity[complexityLevel];
  
  const myTotalMandaysWithRisk = Math.round(myTotalMandaysRaw * riskMultiplier);
  const myMandayDiscountFactor = 1 - (allowMandayDiscount ? mandayDiscountPct / 100 : 0);
  const myRateDiscountFactor = 1 - (rateDiscountPct / 100);
  const myTotalMandays = Math.round(myTotalMandaysWithRisk * myMandayDiscountFactor);
  const myProjectRate = Math.round(myRate * myRateDiscountFactor);
  const myProjectPrice = myTotalMandays * myProjectRate;

  // Timeline calculation
  const timelineWeeks = Math.ceil(myTotalMandays / (teamSize * workingDaysPerWeek));
  const timelineMonths = Math.round(timelineWeeks / 4.33 * 10) / 10;

  const amsBundle = useMemo(() => {
    if (!selectedAMS) return { days: 0, price: 0 };
    const opt = AMS_CHOICES.find(a => a.key === selectedAMS);
    const totalDays = opt.daysPerYear * 3;
    const discounted = Math.round(totalDays * (1 - amsDiscountPct / 100));
    return { days: discounted, price: discounted * amsRate };
  }, [selectedAMS, amsDiscountPct, amsRate]);

  // Enhanced warnings
  const warnings = [];
  if (wrapperDays < 40) warnings.push("Wrapper effort is very low — PMO/Training/Hypercare may be under-scoped.");
  if (includeDRC && !selectedForms.has("tax_invoice")) warnings.push("DRC selected but Tax Invoice form is not selected.");
  if (riskMultiplier > 1.3) warnings.push("High risk factors detected — consider additional contingency.");
  if (myTotalMandays > 800) warnings.push("Project scope is very large — consider phased approach.");
  if (timelineWeeks > 30) warnings.push("Timeline exceeds 30 weeks — may face resource constraints.");

  // Export data
  const exportData = {
    configuration: {
      mode, tier, industryTemplate,
      selectedCaps: Array.from(selectedCaps),
      selectedForms: Array.from(selectedForms),
      selectedIfs: Array.from(selectedIfs),
      riskFactors: { clientType, migrationType, timelineType, complexityLevel },
      rates: { sgRate, fx, myRate, amsRate }
    },
    calculations: {
      functionalDays: myFunctionalDays,
      totalMandays: myTotalMandays,
      projectPrice: myProjectPrice,
      timeline: { weeks: timelineWeeks, months: timelineMonths },
      riskMultiplier
    },
    timestamp: new Date().toISOString()
  };

  /* ---------- UI Render ---------- */
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Enhanced Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AB</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                ABeam Malaysia — Cloud ERP Package Calculator
              </h1>
              <p className="text-xs text-slate-500">
                Enhanced with timeline estimation, risk factors, and industry templates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ExportButton data={exportData} filename={`abeam-package-${tier}-${new Date().toISOString().split('T')[0]}`} />
            
            <div className="hidden md:flex rounded-full border border-slate-300 p-0.5">
              <button
                className={`px-3 py-1.5 rounded-full text-sm ${mode === "guided" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                onClick={() => setMode("guided")}
              >
                Guided
              </button>
              <button
                className={`px-3 py-1.5 rounded-full text-sm ${mode === "free" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                onClick={() => setMode("free")}
              >
                Free Play
              </button>
            </div>

            {mode === "guided" && (
              <div className="hidden md:flex rounded-full border border-slate-300 p-0.5">
                {["essential", "standard", "premium"].map((t) => (
                  <button
                    key={t}
                    className={`px-3 py-1.5 rounded-full text-sm capitalize ${tier === t ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                    onClick={() => setTier(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          
          {/* Industry Template Selector */}
          <Card title="Industry Template" subtitle="Select your manufacturing focus for optimized configurations">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(INDUSTRY_TEMPLATES).map(([key, template]) => (
                <button
                  key={key}
                  className={`p-3 text-left rounded-xl border transition ${industryTemplate === key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                  onClick={() => applyIndustryTemplate(key)}
                >
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{template.description}</div>
                  <div className="text-xs text-blue-600 mt-1">+{template.additionalDays} days</div>
                </button>
              ))}
            </div>
          </Card>

          {mode === "guided" && (
            <Card footer={<span className="text-xs text-slate-500">Preset scopes & efforts applied</span>}>
              <div className="flex gap-2">
                {["essential","standard","premium"].map(t => (
                  <button key={t}
                    className={`px-3 py-1.5 rounded-full text-sm border ${tier===t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                    onClick={()=>setTier(t)}
                  >
                    {t[0].toUpperCase()+t.slice(1)}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Risk Factors */}
          <Card title="Risk Factors & Project Parameters" subtitle="Adjust effort based on project complexity and client context">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SelectField label="Client Type" value={clientType} setValue={setClientType} options={Object.keys(RISK_FACTORS.clientType)} />
              <SelectField label="Migration Type" value={migrationType} setValue={setMigrationType} options={Object.keys(RISK_FACTORS.migration)} />
              <SelectField label="Timeline Pressure" value={timelineType} setValue={setTimelineType} options={Object.keys(RISK_FACTORS.timeline)} />
              <SelectField label="Complexity Level" value={complexityLevel} setValue={setComplexityLevel} options={Object.keys(RISK_FACTORS.complexity)} />
            </div>
            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
              <div className="text-sm text-slate-600">
                Risk Multiplier: <span className="font-medium">{riskMultiplier.toFixed(2)}x</span>
                {riskMultiplier > 1.2 && <span className="text-amber-600 ml-2">⚠️ High Risk</span>}
              </div>
            </div>
          </Card>

          {/* Project Timeline & Resources */}
          <Card title="Project Timeline & Resources" subtitle="Estimate delivery timeline and resource requirements">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Team Size (FTE)" value={teamSize} setValue={setTeamSize} />
              <Field label="Working Days/Week" value={workingDaysPerWeek} setValue={setWorkingDaysPerWeek} />
              <div className="text-sm">
                <span className="block mb-1 text-slate-600">Estimated Timeline</span>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="font-medium text-blue-900">{timelineWeeks} weeks</div>
                  <div className="text-sm text-blue-700">{timelineMonths} months</div>
                </div>
              </div>
              <div className="text-sm">
                <span className="block mb-1 text-slate-600">Resource Utilization</span>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="font-medium text-green-900">{Math.round(myTotalMandays / timelineWeeks)} days/week</div>
                  <div className="text-sm text-green-700">{((myTotalMandays / timelineWeeks / teamSize) * 100).toFixed(0)}% team utilization</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Commercial & Rates */}
          <Card title="Commercial & Rates" subtitle="Adjust base rates & discounts. AMS is optional.">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="SG Rate (SGD/day)" value={sgRate} setValue={setSgRate} />
              <Field label="FX SGD→MYR" value={fx} setValue={setFx} step="0.01" />
              <Field label="MY Project Rate (RM/day)" value={myRate} setValue={setMyRate} />
              <Field label="AMS Rate (RM/day)" value={amsRate} setValue={setAmsRate} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="flex items-end gap-3">
                <Toggle checked={allowMandayDiscount} onChange={setAllowMandayDiscount} />
                <Range label="Manday Discount" value={mandayDiscountPct} setValue={setMandayDiscountPct} />
              </div>
              <Range label="Rate Discount" value={rateDiscountPct} setValue={setRateDiscountPct} />
              <Range label="AMS Bundle Discount" value={amsDiscountPct} setValue={setAmsDiscountPct} min={0} max={25} />
            </div>
          </Card>

          {/* Competitor Comparison */}
          <Card title="Competitive Benchmarking" subtitle="Compare your pricing against key competitors">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(COMPETITOR_BENCHMARKS).map(([key, competitor]) => (
                <Field 
                  key={key}
                  label={`${competitor.name} Price (RM)`} 
                  value={competitorPrices[key]} 
                  setValue={(value) => setCompetitorPrices(prev => ({...prev, [key]: value}))} 
                />
              ))}
            </div>
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <div className="text-sm text-slate-600 mb-2">Competitive Position:</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {Object.entries(competitorPrices).map(([key, price]) => {
                  if (price === 0) return null;
                  const competitor = COMPETITOR_BENCHMARKS[key];
                  const difference = ((myProjectPrice - price) / price * 100).toFixed(1);
                  const isHigher = myProjectPrice > price;
                  return (
                    <div key={key} className={`p-2 rounded ${isHigher ? 'bg-red-50' : 'bg-green-50'}`}>
                      <div className="font-medium">{competitor.name}</div>
                      <div className={isHigher ? 'text-red-600' : 'text-green-600'}>
                        {isHigher ? '+' : ''}{difference}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Functional Capabilities */}
          <Card
            title="Functional Capabilities"
            subtitle="Start from ABeam SG capabilities; tune MY multipliers."
            footer={<div className="text-[11px] text-slate-500">Use multipliers to reflect Malaysia complexity or template efficiencies (e.g., 1.10 for SST overhead, 0.95 for standardized processes).</div>}
          >
            <div className="flex items-start justify-between mb-4">
              <div />
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={includeDRC}
                  onChange={(e) => setIncludeDRC(e.target.checked)}
                />
                Include <span className="font-medium">DRC + Tax Setup</span> if not selected
              </label>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <div className="grid sm:grid-cols-2 gap-3">
                  {SG_CAPS.map((c) => {
                    const checked = selectedCaps.has(c.key);
                    return (
                      <label
                        key={c.key}
                        className={`cursor-pointer rounded-xl border p-3 transition ${checked ? "border-blue-500 bg-blue-50/60" : "border-slate-200 hover:bg-slate-50"}`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={checked}
                            onChange={(e) => {
                              const ns = new Set(selectedCaps);
                              e.target.checked ? ns.add(c.key) : ns.delete(c.key);
                              setSelectedCaps(ns);
                            }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900 truncate">{c.label}</span>
                              <span className="ml-auto text-[11px] font-medium text-slate-600 bg-white/70 border border-slate-200 rounded-full px-2 py-0.5">
                                {c.days}d (SG)
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs text-slate-500">Toggle to include/exclude this scope item.</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                c.category === 'core' ? 'bg-blue-100 text-blue-700' :
                                c.category === 'manufacturing' ? 'bg-purple-100 text-purple-700' :
                                c.category === 'compliance' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {c.category}
                              </span>
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-800">Malaysia Effort Multipliers</h3>
                    <button
                      type="button"
                      className="text-xs text-blue-700 hover:underline"
                      onClick={() => setMyMultipliers(Object.fromEntries(SG_CAPS.map((c) => [c.key, 1])))}
                    >
                      Reset to 1.00
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[460px] overflow-auto pr-1">
                    {SG_CAPS.map((c) => (
                      <div key={c.key} className="flex items-center justify-between rounded-lg bg-white border border-slate-200 px-3 py-2">
                        <span className="text-sm text-slate-700 truncate mr-3">{c.label}</span>
                        <input
                          type="number"
                          step="0.05"
                          value={myMultipliers[c.key] ?? 1}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setMyMultipliers({ ...myMultipliers, [c.key]: Number.isFinite(v) ? v : 1 });
                          }}
                          className="w-24 text-right rounded-md border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Enhanced FRICEW */}
          <Card title="FRICEW — Forms & Interfaces" subtitle="Malaysian-specific forms and system integrations">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-slate-600">Forms</p>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setSelectedForms(new Set(FORMS.filter(f => f.priority === 'high').map(f => f.key)))}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      High Priority Only
                    </button>
                    <span className="text-xs text-slate-400">|</span>
                    <button 
                      onClick={() => setSelectedForms(new Set(FORMS.map(f => f.key)))}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Select All
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {FORMS.map(f => (
                    <CheckboxRow
                      key={f.key}
                      checked={selectedForms.has(f.key)}
                      onChange={(checked) => {
                        const ns = new Set(selectedForms);
                        checked ? ns.add(f.key) : ns.delete(f.key);
                        setSelectedForms(ns);
                      }}
                      left={
                        <div className="flex items-center gap-2">
                          {f.label}
                          {f.malaysiaSpecific && <span className="text-xs text-blue-600">🇲🇾</span>}
                        </div>
                      }
                      right={`${f.days}d`}
                      priority={f.priority}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-3">System Interfaces</p>
                <div className="space-y-2">
                  {INTERFACES.map(i => (
                    <CheckboxRow
                      key={i.key}
                      checked={selectedIfs.has(i.key)}
                      onChange={(checked) => {
                        const ns = new Set(selectedIfs);
                        checked ? ns.add(i.key) : ns.delete(i.key);
                        setSelectedIfs(ns);
                      }}
                      left={
                        <div className="flex items-center gap-2">
                          {i.label}
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            i.complexity === 'high' ? 'bg-red-100 text-red-700' :
                            i.complexity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {i.complexity}
                          </span>
                        </div>
                      }
                      right={`${i.days}d`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Technical & Wrapper */}
          <Card title="Technical & Delivery Wrapper">
            <div className="grid md:grid-cols-4 gap-4">
              <Field label="Security & Authorization (d)" value={securityDays} setValue={setSecurityDays}/>
              <Field label="Tenant Ops (d)" value={tenantOpsDays} setValue={setTenantOpsDays}/>
              <Field label="Migration Cycles" value={migrationCycles} setValue={setMigrationCycles}/>
              <div className="text-xs text-slate-500 flex items-end">x{TECH.migrationPerCycle}d per cycle</div>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mt-4">
              <Field label="PMO & QA (d)" value={pmoDays} setValue={setPmoDays}/>
              <Field label="Cutover (d)" value={cutoverDays} setValue={setCutoverDays}/>
              <Field label="Training (d)" value={trainingDays} setValue={setTrainingDays}/>
              <Field label="Hypercare (d)" value={hypercareDays} setValue={setHypercareDays}/>
            </div>
          </Card>

          {/* Enhanced AMS */}
          <Card title="AMS Bundle (Optional, 3-year)" subtitle="Long-term support packages for ongoing partnership">
            <div className="grid md:grid-cols-3 gap-4 items-start">
              <div className="space-y-2">
                {AMS_CHOICES.map(a => (
                  <label key={a.key} className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <input type="radio" name="ams" className="h-4 w-4" checked={selectedAMS===a.key} onChange={()=>setSelectedAMS(a.key)} />
                      <span className="text-sm text-slate-800">{a.label}</span>
                    </div>
                    <span className="text-xs text-slate-500">{a.daysPerYear}d/yr</span>
                  </label>
                ))}
                <label className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <input type="radio" name="ams" className="h-4 w-4" checked={!selectedAMS} onChange={()=>setSelectedAMS(null)} />
                    <span className="text-sm text-slate-800">No AMS bundle</span>
                  </div>
                </label>
              </div>
              <Range label="AMS Discount" value={amsDiscountPct} setValue={setAmsDiscountPct} min={0} max={25}/>
              <Field label="AMS Rate (RM/day)" value={amsRate} setValue={setAmsRate}/>
            </div>
          </Card>
        </div>

        {/* Enhanced Sticky Summary */}
        <aside className="lg:col-span-4">
          <div className="sticky top-6 space-y-3">
            <Card title="Summary & Comparison" subtitle={mode==='guided' ? `Tier: ${tier} | Industry: ${INDUSTRY_TEMPLATES[industryTemplate].name}` : undefined}>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-2">
                <div className="text-sm font-semibold mb-1">ABeam Singapore (functional only)</div>
                <div className="text-sm">Selected functional: <Num value={sgFunctionalDays}/> d</div>
                <div className="text-sm">Price @ SGD {sgRate}/d × {fx}: RM <Num value={Math.round(sgFunctionalPriceMYR)}/></div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-sm font-semibold mb-1">ABeam Malaysia (full package)</div>
                <div className="text-sm">Functional: <Num value={myFunctionalDays}/> d</div>
                <div className="text-sm">FRICEW: <Num value={formsDays + ifDays}/> d</div>
                <div className="text-sm">Technical: <Num value={technicalDays}/> d</div>
                <div className="text-sm">Wrapper: <Num value={wrapperDays}/> d</div>
                <div className="text-sm">Risk Adjustment: {((riskMultiplier - 1) * 100).toFixed(1)}%</div>
                <hr className="my-2"/>
                <div className="text-sm font-semibold">Total Mandays: <Num value={myTotalMandays}/> d</div>
                <div className="text-sm">Project Rate: RM <Num value={myProjectRate}/></div>
                <div className="text-lg font-bold text-slate-900 mt-1">Project Price: RM <Num value={myProjectPrice}/></div>
                {selectedAMS && (<div className="text-sm mt-1">AMS (3y): <Num value={amsBundle.days}/> d → RM <Num value={amsBundle.price}/></div>)}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <div className="text-sm font-semibold text-blue-900 mb-1">Timeline & Resources</div>
                <div className="text-sm text-blue-800">Duration: {timelineWeeks} weeks ({timelineMonths} months)</div>
                <div className="text-sm text-blue-800">Team: {teamSize} FTE × {workingDaysPerWeek} days/week</div>
                <div className="text-sm text-blue-800">Utilization: {((myTotalMandays / timelineWeeks / teamSize) * 100).toFixed(0)}%</div>
              </div>

              {warnings.length>0 && (
                <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 text-sm text-amber-900 mt-2">
                  <div className="font-semibold mb-1">Guidance</div>
                  <ul className="list-disc ml-5 space-y-1">{warnings.map((w,i)=><li key={i}>{w}</li>)}</ul>
                </div>
              )}
            </Card>
          </div>
        </aside>
      </main>
    </div>
  );
}

/* ---------- Enhanced UI Components ---------- */
function Field({ label, value, setValue, step="1" }) {
  return (
    <label className="text-sm">
      <span className="block mb-1 text-slate-600">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e)=>setValue(+e.target.value || 0)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-right shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}

function SelectField({ label, value, setValue, options }) {
  return (
    <label className="text-sm">
      <span className="block mb-1 text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      >
        {options.map(option => (
          <option key={option} value={option}>
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </option>
        ))}
      </select>
    </label>
  );
}

function Range({ label, value, setValue, min=0, max=10 }) {
  return (
    <label className="text-sm">
      <div className="mb-1 flex items-center justify-between text-slate-600">
        <span>{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step="1"
        value={value}
        onChange={(e)=>setValue(+e.target.value)}
        className="w-full accent-blue-600"
      />
    </label>
  );
}