import React, { useMemo, useState, useEffect } from "react";

/* =========================
   CONFIG (Guided Guardrails)
   ========================= */
const MAX_MANDAY_DISCOUNT = 15; // %
const MAX_RATE_DISCOUNT   = 10; // %
const DEFAULT_ROUNDING    = 1;  // RM1 granularity (set 100 for RM100 rounding)

/* ============================================
   SG Catalog — Finance + SCM (from SG catalog)
   Items without readable values are 0d by default.
   Turn on "Admin Override" to edit any days inline.
   ============================================ */
const SG_CAPS = [
  // --- Finance Base / Core ---
  { key: "fin_master_data_mgt", label: "Financial Master Data Management", days: 0,  category: "core" },
  { key: "fin_multi_gaap_post", label: "Financial Multi-GAAP Posting",    days: 0,  category: "core" },
  { key: "gl_aa_payments_open", label: "GL / AA / Payments / Open-Item",  days: 193, category: "core" },
  { key: "p2p_inv_acct",         label: "Procurement & Inventory Accounting", days: 90, category: "core" },
  { key: "project_accounting",   label: "Project Accounting", days: 64, category: "advanced" },
  { key: "sales_service",        label: "Sales & Service Accounting", days: 77, category: "core" },
  { key: "overhead_prod_margin", label: "Overhead / Production / Margin", days: 103, category: "manufacturing" },
  { key: "std_prod_cost_estim",  label: "Standard Production Cost Estimation", days: 72, category: "manufacturing" },

  // --- Finance Premium adds ---
  { key: "lease",        label: "Lease Accounting", days: 64, category: "advanced" },
  { key: "local_close",  label: "Local Financial Closing", days: 0, category: "reporting" },
  { key: "audit_prep",   label: "Financial Audit Preparation", days: 39, category: "reporting" },
  { key: "fin_analytics_included",   label: "Financial Analytics (included)", days: 0, category: "reporting", included: true },
  { key: "fin_structure_included",   label: "Financial Structure Management (included)", days: 0, category: "reporting", included: true },
  { key: "drc_tax",      label: "Document & Reporting Compliance (e-Invoice)", days: 26, category: "compliance" },
  { key: "tax_det_calc", label: "Tax Determination & Calculation (SST)", days: 0, category: "compliance" },
  { key: "collections",  label: "Collections Management", days: 26, category: "finance" },
  { key: "credit",       label: "Credit Management", days: 26, category: "finance" },
  { key: "dispute_mgt",  label: "Dispute Management", days: 0, category: "finance" },

  // --- Trade / Treasury add-ons ---
  { key: "intrastat",        label: "Intrastat Declaration Management", days: 39, category: "compliance" },
  { key: "trade_comp",       label: "Trade Compliance Management", days: 64, category: "compliance" },
  { key: "trade_prod_class", label: "Trade Product Classification", days: 45, category: "compliance" },
  { key: "cash_mgmt",        label: "Cash & Liquidity Management", days: 51, category: "finance" },
  { key: "pay_central",      label: "Payment Centralization", days: 36, category: "finance" },
  { key: "fund_acct",        label: "Fund Accounting", days: 0, category: "advanced" },
  { key: "grants",           label: "Grants Management", days: 54, category: "advanced" },
  { key: "budgetary",        label: "Budgetary Accounting", days: 0, category: "advanced" },

  // ======================================================
  // ================  SCM (Supply Chain)  =================
  // ======================================================

  // --- SCM Base (typical foundational logistics) ---
  { key: "mm_procurement",      label: "MM Procurement (Purchasing)",          days: 0, category: "scm-base" },
  { key: "inventory_mgmt",      label: "Inventory Management",                 days: 0, category: "scm-base" },
  { key: "mrp",                 label: "Material Requirements Planning (MRP)", days: 0, category: "scm-base" },
  { key: "batch_serial",        label: "Batch / Serial Management",            days: 0, category: "scm-base" },
  { key: "basic_wh_ops",        label: "Basic Warehouse Operations",           days: 0, category: "scm-base" },
  { key: "prod_execution",      label: "Production Execution (Shop Floor)",    days: 0, category: "scm-base" },
  { key: "intra_company_basic", label: "Intra-company Logistics (Basic)",      days: 0, category: "scm-base" },

  // --- SCM Premium (advanced logistics & quality) ---
  { key: "quality_mgmt",        label: "Quality Management (QM)",              days: 0, category: "scm-premium" },
  { key: "adv_wh_mgmt",         label: "Advanced / Extended Warehouse Mgt",    days: 0, category: "scm-premium" },
  { key: "demand_forecast",     label: "Demand Planning / Forecasting",        days: 0, category: "scm-premium" },
  { key: "supplier_collab",     label: "Supplier Collaboration",               days: 0, category: "scm-premium" },
  { key: "transport_mgmt",      label: "Transportation Management",            days: 0, category: "scm-premium" },
  { key: "maintenance",         label: "Plant Maintenance (EAM)",              days: 0, category: "scm-premium" },
  { key: "subcontracting",      label: "Subcontracting",                       days: 0, category: "scm-premium" },
  { key: "intra_company_adv",   label: "Intra-company Logistics (Advanced)",   days: 0, category: "scm-premium" },
];


/* SCM dependency sets (used by Premium preset and for future guided packages) */
const SCM_BASE_KEYS    = ["mm_procurement","inventory_mgmt","mrp","batch_serial","basic_wh_ops","prod_execution","intra_company_basic"];
const SCM_PREMIUM_KEYS = ["quality_mgmt","adv_wh_mgmt","demand_forecast","supplier_collab","transport_mgmt","maintenance","subcontracting","intra_company_adv"];


/* Malaysia multipliers default = 1.00 */
const DEFAULT_MY_MULTIPLIERS = Object.fromEntries(SG_CAPS.map(c => [c.key, 1]));

/* Forms — WHT certificate is optional */
const FORMS = [
  { key: "tax_invoice",    label: "Tax Invoice", days: 4, priority: "high",   malaysiaSpecific: true },
  { key: "credit_note",    label: "Credit Note", days: 3, priority: "high",   malaysiaSpecific: false },
  { key: "debit_note",     label: "Debit Note",  days: 3, priority: "medium", malaysiaSpecific: false },
  { key: "purchase_order", label: "Purchase Order", days: 4, priority: "high", malaysiaSpecific: true },
  { key: "payment_advice", label: "Payment Advice", days: 2, priority: "medium", malaysiaSpecific: true },
  { key: "delivery_note",  label: "Delivery Note", days: 3, priority: "medium", malaysiaSpecific: false },
  { key: "grn",            label: "Goods Receipt Note", days: 2, priority: "medium", malaysiaSpecific: false },
  { key: "remittance",     label: "Remittance Advice", days: 2, priority: "low", malaysiaSpecific: true },
  { key: "soa",            label: "Statement of Account", days: 3, priority: "medium", malaysiaSpecific: false },
  { key: "wht_cert",       label: "Withholding Tax Certificate (optional)", days: 3, priority: "low", malaysiaSpecific: true },
];

/* Interfaces — DRC (API) intentionally omitted; DRC lives under Finance component */
const INTERFACES = [
  { key: "if_payroll_fi",   label: "HR/Payroll → FI Posting",              days: 5, complexity: "medium" },
  { key: "if_open_items",   label: "Legacy AR/AP Open-Items Upload",       days: 5, complexity: "low" },
  { key: "if_bank_export",  label: "Bank Export File (payment)",           days: 5, complexity: "medium" },
  { key: "if_sst_reporting",label: "SST Reporting to LHDN (reports)",      days: 8, complexity: "high" },
  { key: "if_epf_socso",    label: "EPF/SOCSO Integration",                days: 6, complexity: "medium" },
];

/* Industry Templates (added “none” = start from scratch) */
const INDUSTRY_TEMPLATES = {
  none: {
    name: "No Industry Template",
    multipliers: {},
    requiredForms: [],
    requiredInterfaces: [],
    additionalDays: 0,
    description: "Start clean — you toggle only what you need",
  },
  general: {
    name: "General Manufacturing",
    multipliers: {},
    requiredForms: ['tax_invoice', 'purchase_order', 'payment_advice'],
    requiredInterfaces: ['if_payroll_fi'],
    additionalDays: 10,
    description: "Standard manufacturing processes",
  },
  electronics: {
    name: "Electronics Manufacturing",
    multipliers: { gl_aa_payments_open: 1.1, overhead_prod_margin: 1.2, trade_comp: 1.3 },
    requiredForms: ['tax_invoice', 'purchase_order', 'delivery_note', 'grn'],
    requiredInterfaces: ['if_payroll_fi', 'if_bank_export'],
    additionalDays: 15,
    description: "Export compliance & complex BOM",
  },
  foodProcessing: {
    name: "Food Processing",
    multipliers: { overhead_prod_margin: 1.3, trade_comp: 1.4, collections: 1.1 },
    requiredForms: ['tax_invoice', 'purchase_order', 'delivery_note', 'grn', 'soa'],
    requiredInterfaces: ['if_payroll_fi', 'if_sst_reporting'],
    additionalDays: 20,
    description: "HACCP & Halal workflows",
  },
  automotive: {
    name: "Automotive Parts",
    multipliers: { gl_aa_payments_open: 1.15, overhead_prod_margin: 1.25, sales_service: 1.1 },
    requiredForms: ['tax_invoice', 'purchase_order', 'delivery_note', 'grn', 'wht_cert'],
    requiredInterfaces: ['if_payroll_fi', 'if_bank_export', 'if_open_items'],
    additionalDays: 18,
    description: "JIT & quality focus",
  },
};

const RISK_FACTORS = {
  clientType: { new: 1.15, existing: 1.0, returning: 0.95 },
  migration: { greenfield: 1.0, eccMigration: 1.25, legacyMigration: 1.35 },
  timeline: { standard: 1.0, aggressive: 1.3, relaxed: 0.9 },
  complexity: { simple: 0.9, standard: 1.0, complex: 1.2, veryComplex: 1.4 }
};

const TECH = { migrationPerCycle: 20 };

const AMS_CHOICES = [
  { key: "ams30", label: "AMS 30d/year (3y)", daysPerYear: 30 },
  { key: "ams40", label: "AMS 40d/year (3y)", daysPerYear: 40 },
  { key: "ams50", label: "AMS 50d/year (3y)", daysPerYear: 50 },
];

// Helper: build a 1.00 multiplier map for all caps
const resetMultipliers = () =>
  Object.fromEntries(SG_CAPS.map(c => [c.key, 1]));

// Helper: show count of selected items per tab
const tabCount = (lob, selected) =>
  SG_CAPS.filter(c => lobOf(c) === lob && selected.has(c.key)).length;


/* ---------- Small UI helpers ---------- */
const Num = ({ value }) => <span className="font-mono">{Number(value).toLocaleString()}</span>;
const Toggle = ({ checked, onChange }) => (
  <button onClick={() => onChange(!checked)} className={`w-11 h-6 rounded-full p-0.5 transition ${checked ? "bg-blue-600" : "bg-slate-300"}`}>
    <div className={`h-5 w-5 bg-white rounded-full shadow transition ${checked ? "translate-x-5" : ""}`} />
  </button>
);

const PriorityBadge = ({ priority }) => {
  const colors = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-green-100 text-green-800 border-green-200"
  };
  return <span className={`px-2 py-0.5 text-xs rounded-full border ${colors[priority]}`}>{priority}</span>;
};

/* ---------- LoB (Line of Business) grouping ---------- */
const LOB_ORDER = ["Finance", "SCM", "Compliance", "Reporting", "Treasury", "Advanced"];

/* Explicit mapping where needed; rest fall back by category */
const LOB_BY_KEY = {
  // Finance core/premium
  fin_master_data_mgt: "Finance",
  fin_multi_gaap_post: "Finance",
  gl_aa_payments_open: "Finance",
  p2p_inv_acct: "Finance",
  project_accounting: "Finance",
  sales_service: "Finance",
  overhead_prod_margin: "Finance",
  std_prod_cost_estim: "Finance",
  lease: "Finance",
  local_close: "Finance",
  audit_prep: "Reporting",
  fin_analytics_included: "Reporting",
  fin_structure_included: "Reporting",
  drc_tax: "Compliance",
  tax_det_calc: "Compliance",
  collections: "Finance",
  credit: "Finance",
  dispute_mgt: "Finance",
  intrastat: "Compliance",
  trade_comp: "Compliance",
  trade_prod_class: "Compliance",
  cash_mgmt: "Treasury",
  pay_central: "Treasury",
  fund_acct: "Advanced",
  grants: "Advanced",
  budgetary: "Advanced",

  // SCM
  mm_procurement: "SCM",
  inventory_mgmt: "SCM",
  mrp: "SCM",
  batch_serial: "SCM",
  basic_wh_ops: "SCM",
  prod_execution: "SCM",
  intra_company_basic: "SCM",
  quality_mgmt: "SCM",
  adv_wh_mgmt: "SCM",
  demand_forecast: "SCM",
  supplier_collab: "SCM",
  transport_mgmt: "SCM",
  maintenance: "SCM",
  subcontracting: "SCM",
  intra_company_adv: "SCM",
};

const lobOf = (cap) => {
  if (LOB_BY_KEY[cap.key]) return LOB_BY_KEY[cap.key];
  // fallback by category
  if (cap.category?.startsWith("scm")) return "SCM";
  if (cap.category === "compliance")   return "Compliance";
  if (cap.category === "reporting")    return "Reporting";
  if (cap.category === "finance")      return "Finance";
  return "Advanced";
};


/* ---------- Reusable Card ---------- */
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
        <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
               checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="text-sm text-slate-800">{left}</span>
        {priority && <PriorityBadge priority={priority} />}
      </div>
      {right && <span className="text-xs text-slate-500">{right}</span>}
    </label>
  );
}

/* ---------- Export ---------- */
function ExportButtons({ data, filename, summary }) {
  const exportToJSON = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url; link.download = `${filename}.json`; link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <!DOCTYPE html><html><head><title>ABeam Malaysia SAP Package Proposal</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .company-logo { font-size: 24px; font-weight: bold; color: #2563eb; }
        .title { font-size: 28px; font-weight: bold; margin: 10px 0; }
        .subtitle { color: #666; margin-bottom: 20px; }
        .section { margin: 25px 0; }
        .section-title { font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 15px 0; }
        .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; background: #f9fafb; }
        .highlight { background: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .price-box { background: #1e40af; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .price-main { font-size: 32px; font-weight: bold; }
        .price-sub { font-size: 14px; opacity: 0.9; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
        th { background: #f3f4f6; font-weight: bold; }
        .text-right { text-align: right; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 6px; margin: 10px 0; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
        @media print { body { margin: 20px; } }
      </style></head><body>
        <div class="header">
          <div class="company-logo">ABeam Consulting Malaysia</div>
          <div class="title">SAP Cloud ERP Implementation Proposal</div>
          <div class="subtitle">Package: ${summary.tier.toUpperCase()} | Industry: ${summary.industryTemplate} | Generated: ${new Date().toLocaleDateString()}</div>
        </div>

        <div class="price-box">
          <div class="price-main">RM ${summary.projectPrice.toLocaleString()}</div>
          <div class="price-sub">${summary.totalMandays} mandays | ${summary.timelineWeeks} weeks delivery</div>
        </div>

        <div class="section">
          <div class="section-title">Executive Summary</div>
          <div class="grid">
            <div class="card">
              <strong>Implementation Approach</strong><br>
              Tier: ${summary.tier.toUpperCase()}<br>
              Industry Template: ${summary.industryTemplate}<br>
              Risk Level: ${summary.riskMultiplier.toFixed(2)}x multiplier
            </div>
            <div class="card">
              <strong>Timeline & Resources</strong><br>
              Duration: ${summary.timelineWeeks} weeks (${summary.timelineMonths} months)<br>
              Team Size: ${summary.teamSize} FTE<br>
              Utilization: ${summary.utilization}%
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Effort Breakdown</div>
          <table>
            <tr><th>Component</th><th class="text-right">Days</th><th class="text-right">Cost (RM)</th></tr>
            <tr><td>Functional Implementation</td><td class="text-right">${summary.functionalDays}</td><td class="text-right">${(summary.functionalDays * summary.projectRate).toLocaleString()}</td></tr>
            <tr><td>Forms & Interfaces (FRICEW)</td><td class="text-right">${summary.fricewDays}</td><td class="text-right">${(summary.fricewDays * summary.projectRate).toLocaleString()}</td></tr>
            <tr><td>Technical Setup</td><td class="text-right">${summary.technicalDays}</td><td class="text-right">${(summary.technicalDays * summary.projectRate).toLocaleString()}</td></tr>
            <tr><td>Project Delivery Wrapper</td><td class="text-right">${summary.wrapperDays}</td><td class="text-right">${(summary.wrapperDays * summary.projectRate).toLocaleString()}</td></tr>
            <tr style="font-weight: bold; background: #f3f4f6;"><td>Total Implementation</td><td class="text-right">${summary.totalMandays}</td><td class="text-right">${summary.projectPrice.toLocaleString()}</td></tr>
            ${summary.amsPrice > 0 ? `<tr><td>AMS Bundle (3 years)</td><td class="text-right">${summary.amsDays}</td><td class="text-right">${summary.amsPrice.toLocaleString()}</td></tr>` : ''}
          </table>
        </div>

        <div class="section">
          <div class="section-title">Singapore Comparison</div>
          <div class="highlight">
            <strong>ABeam Singapore vs Malaysia:</strong><br>
            Singapore (functional only): ${summary.sgFunctionalDays} days → RM ${summary.sgFunctionalPriceMYR.toLocaleString()}<br>
            Malaysia (complete package): ${summary.totalMandays} days → RM ${summary.projectPrice.toLocaleString()}<br>
            <strong>Malaysia provides complete solution with ${summary.efficiency}% efficiency gain</strong>
          </div>
        </div>

        ${summary.competitorAnalysis?.length ? `
        <div class="section">
          <div class="section-title">Competitive Analysis</div>
          <table>
            <tr><th>Competitor</th><th class="text-right">Price (RM)</th><th class="text-right">Difference</th><th>Position</th></tr>
            ${summary.competitorAnalysis.map(comp => `
              <tr>
                <td>${comp.name}</td>
                <td class="text-right">${comp.price.toLocaleString()}</td>
                <td class="text-right" style="color: ${comp.isHigher ? '#dc2626' : '#16a34a'}">${comp.difference}</td>
                <td>${comp.position}</td>
              </tr>
            `).join('')}
          </table>
        </div>` : ''}

        <div class="section">
          <div class="section-title">Scope & Deliverables</div>
          <div class="grid">
            <div class="card">
              <strong>Functional Capabilities</strong><br>
              ${summary.selectedCapabilities.join('<br>')}
            </div>
            <div class="card">
              <strong>Forms & Interfaces</strong><br>
              ${summary.selectedForms.join('<br>')}<br>
              <br><strong>Interfaces:</strong><br>
              ${summary.selectedInterfaces.join('<br>')}
            </div>
          </div>
        </div>

        ${summary.warnings.length ? `
        <div class="section">
          <div class="section-title">Project Considerations</div>
          ${summary.warnings.map(w => `<div class="warning">${w}</div>`).join('')}
        </div>` : ''}

        <div class="section">
          <div class="section-title">Commercial Terms</div>
          <div class="grid">
            <div class="card">
              <strong>Pricing Structure</strong><br>
              Base Rate: RM ${summary.projectRate.toLocaleString()}/day<br>
              ${summary.mandayDiscount > 0 ? `Manday Discount: ${summary.mandayDiscount}%<br>` : ''}
              ${summary.rateDiscount > 0 ? `Rate Discount: ${summary.rateDiscount}%<br>` : ''}
              Fixed Price Implementation
            </div>
            <div class="card">
              <strong>Payment & Notes</strong><br>
              Total Investment: RM ${summary.projectPrice.toLocaleString()}<br>
              Timeline: ${summary.timelineWeeks} weeks<br>
              ${summary.amsPrice > 0 ? `Optional AMS: RM ${summary.amsPrice.toLocaleString()}<br>` : ''}
              Includes 1-month hypercare<br>
              <em>e-Invoice (LHDN): Portal-upload ready (DRC/API in Standard/Premium)</em>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>This proposal is generated by ABeam Malaysia SAP Package Calculator. Final scope & pricing subject to formal SOW.</p>
          <p><strong>ABeam Consulting Malaysia</strong> | SAP Cloud ERP Implementation Services | ${new Date().toLocaleString()}</p>
        </div>
      </body></html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="flex gap-2">
      <button onClick={exportToPDF} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition">📄 Export PDF</button>
      <button onClick={exportToJSON} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">⚙️ Save Config</button>
    </div>
  );
}

/* =============================== Main App =============================== */
export default function App() {
  /* Core State */
  const [mode, setMode] = useState("guided");
  const [tier, setTier] = useState("essential");
  const [industryTemplate, setIndustryTemplate] = useState("none");

/* Tabs + search */
const [activeLob, setActiveLob] = useState("Finance");
const [capSearch, setCapSearch] = useState("");

  /* Functional */
  const [selectedCaps, setSelectedCaps] = useState(new Set(["gl_aa_payments_open", "p2p_inv_acct"]));
  const [includeDRC, setIncludeDRC] = useState(false);
  const [myMultipliers, setMyMultipliers] = useState(DEFAULT_MY_MULTIPLIERS);

  /* FRICEW */
  const [selectedForms, setSelectedForms] = useState(new Set(["tax_invoice","credit_note","debit_note","purchase_order","payment_advice","remittance"]));
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

  /* Team / Timeline */
  const [teamSize, setTeamSize] = useState(5);
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState(5);

  /* AMS */
  const [selectedAMS, setSelectedAMS] = useState(null);
  const [amsDiscountPct, setAmsDiscountPct] = useState(15);

  /* Admin / advanced */
  const [adminOverride, setAdminOverride] = useState(false);
  const [rounding, setRounding]       = useState(DEFAULT_ROUNDING);
  // --- add this RIGHT BELOW adminOverride/rounding state ---
/* Editable SG days (enables inline override when Admin Override = ON) */
const [capDays, setCapDays] = useState(
  Object.fromEntries(SG_CAPS.map(c => [c.key, c.days]))
);


  /* Guided Presets */
  const applyTier = (t) => {
    setTier(t);
    if (t === "essential") {
      setSelectedCaps(new Set(["gl_aa_payments_open", "p2p_inv_acct"]));
      setIncludeDRC(false);
      setSelectedForms(new Set(["tax_invoice","credit_note","debit_note","purchase_order","payment_advice","remittance"]));
      setSelectedIfs(new Set());
      setSecurityDays(20); setTenantOpsDays(15); setMigrationCycles(2);
      setPmoDays(55); setCutoverDays(12); setTrainingDays(15); setHypercareDays(15);
    }
    if (t === "standard") {
      setSelectedCaps(new Set(["gl_aa_payments_open","p2p_inv_acct","collections","credit","sales_service"]));
      setIncludeDRC(true);
      setSelectedForms(new Set(["tax_invoice","credit_note","debit_note","purchase_order","payment_advice","delivery_note","grn","remittance"]));
      setSelectedIfs(new Set(["if_payroll_fi","if_open_items"]));
      setSecurityDays(20); setTenantOpsDays(20); setMigrationCycles(3);
      setPmoDays(65); setCutoverDays(15); setTrainingDays(20); setHypercareDays(20);
    }
    if (t === "premium") {
      const base = ["gl_aa_payments_open","p2p_inv_acct","collections","credit","sales_service",
                    "overhead_prod_margin","lease","cash_mgmt","trade_comp"];
      const withSCM = [...base, ...SCM_BASE_KEYS];
      setSelectedCaps(new Set(withSCM));
      setIncludeDRC(true);
      setSelectedForms(new Set(FORMS.map(f => f.key)));
      setSelectedIfs(new Set(["if_payroll_fi","if_open_items","if_bank_export"]));
      setSecurityDays(25); setTenantOpsDays(25); setMigrationCycles(3);
      setPmoDays(75); setCutoverDays(18); setTrainingDays(25); setHypercareDays(25);
    }
  };

  /* Template application */
  const applyIndustryTemplate = (template) => {
    setIndustryTemplate(template);
    const cfg = INDUSTRY_TEMPLATES[template];
    const newMultipliers = { ...DEFAULT_MY_MULTIPLIERS };
    Object.entries(cfg.multipliers).forEach(([k,v]) => { newMultipliers[k] = v; });
    setMyMultipliers(newMultipliers);
    setSelectedForms(new Set(cfg.requiredForms));
    setSelectedIfs(new Set(cfg.requiredInterfaces));
  };

  useEffect(() => { if (mode === "guided") applyTier(tier); }, [mode, tier]);

  /* ===== Calculations ===== */
  const sgSelected = useMemo(() => SG_CAPS.filter(c => selectedCaps.has(c.key)), [selectedCaps]);

const sgFunctionalDays = useMemo(() => {
  let base = sgSelected.reduce((a, c) => a + (capDays[c.key] ?? 0), 0);
  if (includeDRC && !selectedCaps.has("drc_tax")) base += (capDays["drc_tax"] ?? 0);
  return base;
}, [sgSelected, includeDRC, selectedCaps, capDays]);


  const sgFunctionalPriceMYR = useMemo(
    () => roundTo((sgFunctionalDays * sgRate * fx), rounding),
    [sgFunctionalDays, sgRate, fx, rounding]
  );

const myFunctionalDays = useMemo(() => {
  let total = 0;
  sgSelected.forEach(c => total += (capDays[c.key] ?? 0) * (myMultipliers[c.key] ?? 1));
  if (includeDRC && !selectedCaps.has("drc_tax")) {
    total += (capDays["drc_tax"] ?? 0) * (myMultipliers["drc_tax"] ?? 1);
  }
  const tpl = INDUSTRY_TEMPLATES[industryTemplate];
  total += (tpl?.additionalDays ?? 0);
  return Math.round(total);
}, [sgSelected, includeDRC, selectedCaps, myMultipliers, industryTemplate, capDays]);


// Dependency: if *anything* beyond Finance Core is selected, core must be present (unless override)
const financeCoreKeys = new Set(["gl_aa_payments_open","p2p_inv_acct"]);
const requiresFinance = useMemo(() => {
  if (adminOverride) return false;
  const hasNonCore = [...selectedCaps].some(k => !financeCoreKeys.has(k));
  const coreMissing = !(selectedCaps.has("gl_aa_payments_open") && selectedCaps.has("p2p_inv_acct"));
  return hasNonCore && coreMissing;
}, [selectedCaps, adminOverride]);


  const formsDays = useMemo(() => FORMS.filter(f => selectedForms.has(f.key)).reduce((a, b) => a + b.days, 0), [selectedForms]);
  const ifDays    = useMemo(() => INTERFACES.filter(i => selectedIfs.has(i.key)).reduce((a, b) => a + b.days, 0), [selectedIfs]);

  const technicalDays = securityDays + tenantOpsDays + migrationCycles * TECH.migrationPerCycle;
  const wrapperDays   = pmoDays + cutoverDays + trainingDays + hypercareDays;

  const myTotalMandaysRaw = myFunctionalDays + formsDays + ifDays + technicalDays + wrapperDays;

  const riskMultiplier = RISK_FACTORS.clientType[clientType] *
                         RISK_FACTORS.migration[migrationType] *
                         RISK_FACTORS.timeline[timelineType] *
                         RISK_FACTORS.complexity[complexityLevel];

  const myTotalMandaysWithRisk = Math.round(myTotalMandaysRaw * riskMultiplier);
  const myMandayDiscountFactor = 1 - (allowMandayDiscount ? (mandayDiscountPct / 100) : 0);
  const myRateDiscountFactor   = 1 - (rateDiscountPct / 100);

  const myTotalMandays = Math.round(myTotalMandaysWithRisk * myMandayDiscountFactor);
  const myProjectRate  = Math.round(myRate * myRateDiscountFactor);
  const myProjectPrice = roundTo(myTotalMandays * myProjectRate, rounding);

  // Timeline
  const timelineWeeks  = Math.ceil(myTotalMandays / (teamSize * workingDaysPerWeek));
  const timelineMonths = Math.round((timelineWeeks / 4.33) * 10) / 10;

  // AMS bundle
  const amS = useMemo(() => {
    if (!selectedAMS) return { days: 0, price: 0 };
    const opt = AMS_CHOICES.find(a => a.key === selectedAMS);
    const totalDays = opt.daysPerYear * 3;
    const discounted = Math.round(totalDays * (1 - amsDiscountPct / 100));
    return { days: discounted, price: roundTo(discounted * amsRate, rounding) };
  }, [selectedAMS, amsDiscountPct, amsRate, rounding]);

  // Warnings
  const warnings = [];
  if (requiresFinance) warnings.push("Finance Core is required for non-Finance scope (admin override available).");
  if (allowMandayDiscount && mandayDiscountPct > MAX_MANDAY_DISCOUNT) warnings.push(`Manday discount ${mandayDiscountPct}% exceeds policy cap of ${MAX_MANDAY_DISCOUNT}%. Approval required.`);
  if (rateDiscountPct > MAX_RATE_DISCOUNT) warnings.push(`Rate discount ${rateDiscountPct}% exceeds policy cap of ${MAX_RATE_DISCOUNT}%. Approval required.`);
  if (wrapperDays < 40) warnings.push("Wrapper effort looks low — PMO/Training/Hypercare may be under-scoped.");
  if (includeDRC && !selectedForms.has("tax_invoice")) warnings.push("DRC selected but Tax Invoice form not selected.");
  if (riskMultiplier > 1.3) warnings.push("High risk factors detected — consider contingency.");
  if (myTotalMandays > 800) warnings.push("Large scope — consider phased approach.");
  if (timelineWeeks > 30) warnings.push("Timeline exceeds 30 weeks — resource constraints possible.");

  // Export data & PDF summary
  const exportData = {
    configuration: {
      mode, tier, industryTemplate, adminOverride, rounding,
      selectedCaps: Array.from(selectedCaps),
      selectedForms: Array.from(selectedForms),
      selectedIfs: Array.from(selectedIfs),
      riskFactors: { clientType, migrationType, timelineType, complexityLevel },
      rates: { sgRate, fx, myRate, amsRate },
      discounts: { manday: mandayDiscountPct, rate: rateDiscountPct, ams: amsDiscountPct }
    },
    calculations: {
      functionalDays: myFunctionalDays,
      fricewDays: formsDays + ifDays,
      technicalDays, wrapperDays,
      totalMandays: myTotalMandays,
      projectRate: myProjectRate,
      projectPrice: myProjectPrice,
      timeline: { weeks: timelineWeeks, months: timelineMonths },
      riskMultiplier
    },
    timestamp: new Date().toISOString()
  };

  const pdfSummary = {
    tier,
    industryTemplate: INDUSTRY_TEMPLATES[industryTemplate].name,
    projectPrice: myProjectPrice,
    totalMandays: myTotalMandays,
    timelineWeeks, timelineMonths,
    teamSize,
    utilization: Math.round((myTotalMandays / timelineWeeks / teamSize) * 100),
    riskMultiplier,
    functionalDays: myFunctionalDays,
    fricewDays: formsDays + ifDays,
    technicalDays, wrapperDays,
    projectRate: myProjectRate,
    sgFunctionalDays, sgFunctionalPriceMYR: Math.round(sgFunctionalPriceMYR),
    efficiency: Math.round((1 - myTotalMandays / Math.max(1, sgFunctionalDays)) * 100),
    amsDays: amS.days, amsPrice: amS.price,
    mandayDiscount: allowMandayDiscount ? mandayDiscountPct : 0,
    rateDiscount: rateDiscountPct,
    selectedCapabilities: sgSelected.map(c => c.label),
    selectedForms: FORMS.filter(f => selectedForms.has(f.key)).map(f => f.label),
    selectedInterfaces: INTERFACES.filter(i => selectedIfs.has(i.key)).map(i => i.label),
    warnings,
    competitorAnalysis: [] // (optional) feed from your own UI if you add competitor inputs
  };

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
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
              <p className="text-xs text-slate-500">Guided presets + free play. SG baseline → MY tuned.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ExportButtons
              data={exportData}
              filename={`abeam-package-${tier}-${new Date().toISOString().split('T')[0]}`}
              summary={pdfSummary}
            />
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
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">

          {/* Industry Template */}
          <Card title="Industry Template" subtitle="Pick none (clean) or a preset with multipliers & must-have forms/interfaces">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(INDUSTRY_TEMPLATES).map(([key, template]) => (
                <button
                  key={key}
                  className={`p-3 text-left rounded-xl border transition ${industryTemplate === key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                  onClick={() => applyIndustryTemplate(key)}
                >
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{template.description}</div>
                  {template.additionalDays > 0 && (
                    <div className="text-xs text-blue-600 mt-1">+{template.additionalDays} days</div>
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* Guided tier buttons */}
          {mode === "guided" && (
            <Card footer={<span className="text-xs text-slate-500">Presets reflect our Essential / Standard / Premium logic.</span>}>
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
          <Card title="Risk Factors & Project Parameters" subtitle="Adjust effort based on project context">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SelectField label="Client Type" value={clientType} setValue={setClientType} options={Object.keys(RISK_FACTORS.clientType)} />
              <SelectField label="Migration Type" value={migrationType} setValue={setMigrationType} options={Object.keys(RISK_FACTORS.migration)} />
              <SelectField label="Timeline Pressure" value={timelineType} setValue={setTimelineType} options={Object.keys(RISK_FACTORS.timeline)} />
              <SelectField label="Complexity" value={complexityLevel} setValue={setComplexityLevel} options={Object.keys(RISK_FACTORS.complexity)} />
            </div>
            <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
              Risk Multiplier: <span className="font-medium">{riskMultiplier.toFixed(2)}x</span>
              {riskMultiplier > 1.2 && <span className="text-amber-600 ml-2">⚠️ High Risk</span>}
            </div>
          </Card>

          {/* Timeline & Resources */}
          <Card title="Project Timeline & Resources" subtitle="Estimate delivery timeline & resource utilization">
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
                <span className="block mb-1 text-slate-600">Utilization</span>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="font-medium text-green-900">{Math.round(myTotalMandays / timelineWeeks)} days/week</div>
                  <div className="text-sm text-green-700">{((myTotalMandays / timelineWeeks / teamSize) * 100).toFixed(0)}% team utilization</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Commercial & Rates */}
          <Card title="Commercial & Rates" subtitle="Adjust base rates, discounts, rounding. (Admin Override moved to Functional Capabilities)">
  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
    <Field label="SG Rate (SGD/day)" value={sgRate} setValue={setSgRate} />
    <Field label="FX SGD→MYR" value={fx} setValue={setFx} step="0.01" />
    <Field label="MY Project Rate (RM/day)" value={myRate} setValue={setMyRate} />
    <Field label="AMS Rate (RM/day)" value={amsRate} setValue={setAmsRate} />
    <Field label="Rounding (RM)" value={rounding} setValue={setRounding} />
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


          {/* Functional Capabilities (Tabbed) */}
<Card
  title="Functional Capabilities"
  subtitle="Start from ABeam SG capabilities; tune MY multipliers. DRC is under Finance."
  footer={
    <div className="text-[11px] text-slate-500">
      Multipliers reflect Malaysia complexity or template efficiencies (e.g., 1.10 for SST overhead, 0.95 for standardized processes).
    </div>
  }
>
  {/* Tabs + DRC + Admin toggle */}
  <div className="flex items-center justify-between mb-3">
    <div className="flex flex-wrap gap-2 -mt-1">
      {LOB_ORDER.map((lob) => (
        <button
          key={lob}
          className={`px-3 py-1.5 rounded-full text-sm border transition ${
            activeLob === lob ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          }`}
          onClick={() => setActiveLob(lob)}
        >
          {`${lob} (${tabCount(lob, selectedCaps)})`}
        </button>
      ))}
    </div>

    <div className="flex items-center gap-4">
      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          checked={includeDRC}
          onChange={(e) => setIncludeDRC(e.target.checked)}
        />
        Include <span className="font-medium">DRC + e-Invoice</span> if not selected
      </label>

      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
        <Toggle checked={adminOverride} onChange={setAdminOverride} />
        <span>Admin Override</span>
      </label>
    </div>
  </div>

  {/* Tab toolbar */}
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={capSearch}
        onChange={(e) => setCapSearch(e.target.value)}
        placeholder={`Search ${activeLob} capabilities...`}
        className="w-72 max-w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      />
      <button
        className="text-xs text-blue-700 hover:underline"
        onClick={() => {
          const keys = SG_CAPS.filter(c => lobOf(c) === activeLob).map(c => c.key);
          const ns = new Set(selectedCaps);
          keys.forEach(k => ns.add(k));
          setSelectedCaps(ns);
        }}
      >
        Select all in tab
      </button>
      <button
        className="text-xs text-blue-700 hover:underline"
        onClick={() => {
          const keys = new Set(SG_CAPS.filter(c => lobOf(c) === activeLob).map(c => c.key));
          const ns = new Set([...selectedCaps].filter(k => !keys.has(k)));
          setSelectedCaps(ns);
        }}
      >
        Clear tab
      </button>
    </div>

    <button
      type="button"
      className="text-xs text-blue-700 hover:underline"
      onClick={() => setMyMultipliers(resetMultipliers())}
    >
      Reset multipliers to 1.00
    </button>
  </div>

  <div className="grid lg:grid-cols-12 gap-6">
    {/* Left: capabilities in current tab */}
    <div className="lg:col-span-7 space-y-2">
      {SG_CAPS
        .filter(c => lobOf(c) === activeLob)
        .filter(c => (capSearch ? c.label.toLowerCase().includes(capSearch.toLowerCase()) : true))
        .map((c) => {
          const checked = selectedCaps.has(c.key);
          const days = capDays[c.key] ?? 0;
          return (
            <label
              key={c.key}
              className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                checked ? "border-blue-500 bg-blue-50/60" : "border-slate-200 hover:bg-slate-50"
              }`}
              title={c.label}
            >
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
              <div className="min-w-0 w-full">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-900 font-medium mr-2 whitespace-normal break-words" title={c.label}>
                    {c.label}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    c.category === 'core' ? 'bg-blue-100 text-blue-700' :
                    c.category?.startsWith('scm') ? 'bg-purple-100 text-purple-700' :
                    c.category === 'compliance' ? 'bg-orange-100 text-orange-700' :
                    c.category === 'reporting' ? 'bg-emerald-100 text-emerald-700' :
                    c.category === 'finance' ? 'bg-sky-100 text-sky-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{c.category || 'other'}</span>

                  {!adminOverride ? (
                    <span className="ml-auto text-[11px] font-medium text-slate-600 bg-white/70 border border-slate-200 rounded-full px-2 py-0.5">
                      {days}d (SG)
                    </span>
                  ) : (
                    <span className="ml-auto flex items-center gap-1 text-[12px]">
                      <span className="text-slate-500">SG days:</span>
                      <input
                        type="number"
                        step="1"
                        value={days}
                        onChange={(e) => setCapDays(prev => ({ ...prev, [c.key]: Math.max(0, +e.target.value || 0) }))}
                        className="w-20 text-right rounded border border-slate-300 px-2 py-0.5 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </span>
                  )}
                </div>
                {c.included && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Included (0 additional days) — can be adjusted if needed.
                  </div>
                )}
              </div>
            </label>
          );
        })}
    </div>

    {/* Right: Multipliers list (same tab) */}
    <div className="lg:col-span-5">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-800">Malaysia Effort Multipliers</h3>
          <button
            type="button"
            className="text-xs text-blue-700 hover:underline"
            onClick={() => setMyMultipliers(resetMultipliers())}
          >
            Reset to 1.00
          </button>
        </div>

        <div className="space-y-2 max-h-[460px] overflow-auto pr-1">
          {SG_CAPS
            .filter(c => lobOf(c) === activeLob)
            .filter(c => (capSearch ? c.label.toLowerCase().includes(capSearch.toLowerCase()) : true))
            .map((c) => (
              <div key={c.key} className="flex items-center justify-between rounded-lg bg-white border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700 mr-3 whitespace-normal break-words" title={c.label}>
                  {c.label}
                </span>
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



          {/* FRICEW */}
          <Card title="FRICEW — Forms & Interfaces" subtitle="Malaysia-specific forms & interfaces. DRC handled under Finance.">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-slate-600">Forms</p>
                  <div className="flex gap-1">
                    <button onClick={() => setSelectedForms(new Set(FORMS.filter(f => f.priority === 'high').map(f => f.key)))}
                            className="text-xs text-blue-600 hover:underline">High Priority Only</button>
                    <span className="text-xs text-slate-400">|</span>
                    <button onClick={() => setSelectedForms(new Set(FORMS.map(f => f.key)))}
                            className="text-xs text-blue-600 hover:underline">Select All</button>
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
                      left={<div className="flex items-center gap-2">{f.label}{f.malaysiaSpecific && <span className="text-xs text-blue-600">🇲🇾</span>}</div>}
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
                      left={<div className="flex items-center gap-2">{i.label}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          i.complexity === 'high' ? 'bg-red-100 text-red-700' :
                          i.complexity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>{i.complexity}</span></div>}
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

          {/* AMS */}
          <Card title="AMS Bundle (Optional, 3-year)" subtitle="Offer 30–50 days/year with discount">
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

        {/* Sticky Summary */}
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
                {selectedAMS && (<div className="text-sm mt-1">AMS (3y): <Num value={amS.days}/> d → RM <Num value={amS.price}/></div>)}
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

/* ---------- Inputs ---------- */
function Field({ label, value, setValue, step="1" }) {
  return (
    <label className="text-sm">
      <span className="block mb-1 text-slate-600">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e)=>setValue(+e.target.value || 0)}
        className="w-full min-w-[140px] rounded-md border border-slate-300 px-3 py-2 text-right shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
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

/* ---------- Utils ---------- */
function roundTo(value, granularity = 1) {
  if (!granularity || granularity <= 1) return Math.round(value);
  return Math.round(value / granularity) * granularity;
}
