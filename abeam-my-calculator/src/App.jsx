// src/App.jsx
import React, { useMemo, useState, useEffect } from "react";

/* =========================
   CONFIG (Guardrails)
   ========================= */
const MAX_MANDAY_DISCOUNT = 15; // %
const MAX_RATE_DISCOUNT   = 10; // %
const DEFAULT_ROUNDING    = 1;  // RM1 granularity
const roundTo = (n, step = 1) => Math.round((+n || 0) / step) * step;

const formatDateTime = (d = new Date()) => {
  const dd  = String(d.getDate()).padStart(2, "0");
  const mmm = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
  const yyyy = d.getFullYear();
  let hh = d.getHours();
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12 || 12; // 0 -> 12
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${dd}-${mmm}-${yyyy} at ${String(hh).padStart(2,"0")}:${mm} ${ampm}`;
};

/* ============================================
   FORMS & INTERFACES
   ============================================ */
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

const INTERFACES = [
  { key: "if_payroll_fi",   label: "HR/Payroll → FI Posting",              days: 5, complexity: "medium" },
  { key: "if_open_items",   label: "Legacy AR/AP Open-Items Upload",       days: 5, complexity: "low" },
  { key: "if_bank_export",  label: "Bank Export File (payment)",           days: 5, complexity: "medium" },
  { key: "if_sst_reporting",label: "SST Reporting to LHDN (reports)",      days: 8, complexity: "high" },
  { key: "if_epf_socso",    label: "EPF/SOCSO Integration",                days: 6, complexity: "medium" },
];

/* ============================================
   Industry templates
   ============================================ */
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

/* ============================================
   Risk factors / Tech / AMS
   ============================================ */
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

/* ============================================
   Functional Catalog (UNCHANGED)
   ============================================ */
const SG_CAPS = [
  // ========= FINANCE =========
  { key: "finance_base_424", label: "Finance Base Capabilities for Finance, P2P & OTC (all inclusions)", days: 424,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", bundle: true },

  { key: "fin_master_data_mgt",  label: "Financial Master Data Management", days: 193,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base" },

  { key: "fin_multi_gaap_post",  label: "Financial Multi-GAAP Posting", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  { key: "gl_general_ledger",    label: "General Ledger Accounting", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  { key: "aa_asset_acct",        label: "Asset Accounting", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  { key: "pay_processing",       label: "Payment Processing (payables and receivables)", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  { key: "open_item_mgt",        label: "Open Item Management (payables and receivables)", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  { key: "p2p_inv_acct",         label: "Procurement & Inventory Accounting", days: 90,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base" },

  { key: "project_accounting",   label: "Project Accounting", days: 64,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base" },

  { key: "sales_service",        label: "Sales and Service Accounting", days: 77,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base" },

  { key: "overhead_cost_acct",   label: "Overhead Cost Accounting", days: 103,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base" },

  { key: "prod_cost_acct",       label: "Production Cost Accounting", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  { key: "predictive_acct",      label: "Predictive Accounting", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  { key: "rev_cost_recog",       label: "Revenue and Cost Recognition", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  { key: "std_prod_cost_estim",  label: "Standard Production Cost Estimation", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  { key: "margin_analysis",      label: "Margin Analysis", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  { key: "transfer_price_mgt",   label: "Transfer Price Management", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  { key: "value_chain_record",   label: "Value Chain Recording", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  { key: "lease",                label: "Lease Accounting", days: 64,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base" },

  { key: "fin_lease_mgt",        label: "Financial Lease Management", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  { key: "local_close",          label: "Local Financial Closing", days: 39,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base" },

  { key: "audit_prep",           label: "Financial Audit Preparation", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  { key: "fin_analytics",        label: "Financial Analytics", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  { key: "fin_structure",        label: "Financial Structure Management", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  // DRC explicit (39d). Optional in Essential; Included in Standard/Premium.
  { key: "drc_tax",              label: "Document & Reporting Compliance (e-Invoice)", days: 39,
    function: "Finance", product: "SAP DRC Cloud Edition", package: "Exchange Electronic Documents" },

  { key: "tax_det_calc",         label: "Tax Determination and Calculation", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  { key: "collections",          label: "Collections Management", days: 26,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base" },

  { key: "credit",               label: "Credit Management", days: 26,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base" },

  { key: "dispute_mgt",          label: "Dispute Management", days: 39,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base" },

  { key: "intrastat",            label: "Intrastat Declaration Management", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  { key: "trade_comp",           label: "Trade Compliance Management", days: 64,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base" },

  { key: "trade_prod_class",     label: "Trade Product Classification Management", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  { key: "cash_mgmt",            label: "Cash and Liquidity Management", days: 51,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base" },

  { key: "pay_central",          label: "Payment Centralization", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  { key: "fund_acct",            label: "Fund Accounting", days: 77,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base" },

  { key: "grants",               label: "Grants Management", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  { key: "budgetary",            label: "Budgetary Accounting", days: 0,
    function: "Finance", product: "SAP S/4HANA Cloud Public Edition", package: "Finance Base", includedIn: "finance_base_424" },

  // MBC + Market Rate + DRC Cloud Edition explicit
  { key: "pay_central_mbc_39",   label: "Payment Centralization – Multi-Bank Connectivity", days: 39,
    function: "Finance", product: "SAP MBC", package: "Corporate Base Connection" },

  { key: "pay_central_mbc_tx",   label: "Payment Centralization – Multi-Bank Connectivity (Transactions)", days: 0,
    function: "Finance", product: "SAP Multi-Bank Connectivity", package: "Transactions", includedIn: "pay_central_mbc_39" },

  { key: "market_rate_mgt_26",   label: "Market Rate Management", days: 26,
    function: "Finance", product: "Market Rate Management", package: "Standard" },

  { key: "drc_cloud_exchange_39", label: "Exchange invoices electronically with authorities/partners", days: 39,
    function: "Finance", product: "SAP Document & Reporting Compliance", package: "Cloud Edition" },

  // -- Finance Premium Package (selected highlights)
  { key: "prm_project_sched_129", label: "Project Schedule Management", days: 129,
    function: "Finance", product: "SAP Project & Resource Mgmt", package: "Premium" },

  { key: "prm_subscription_billing_90", label: "Subscription Billing — Consumption/Usage/Subscription Mgmt", days: 90,
    function: "Finance", product: "SAP Subscription Billing", package: "Premium" },

  { key: "concur_expense_103", label: "Concur Expense Professional — Advance/Corp Card/Expense/Analytics", days: 103,
    function: "Finance", product: "Concur Expense Professional", package: "Premium" },

  { key: "taulia_receivables_26", label: "SAP Taulia Base — Receivables Financing", days: 26,
    function: "Finance", product: "SAP Taulia Base", package: "Premium" },

  { key: "fieldglass_services_103", label: "Fieldglass Supplier Portal — Services (Quotes/Req/PoS)", days: 103,
    function: "Finance", product: "Fieldglass Supplier Portal", package: "Premium" },

  { key: "sales_cloud_lead_to_forecast_193", label: "SAP Sales Cloud — Lead→Forecast chain", days: 193,
    function: "Finance", product: "SAP Sales Cloud", package: "Premium" },

  { key: "ariba_expansion_apps_129", label: "Ariba Procurement Expansion Apps — Self-Service Requisitioning", days: 129,
    function: "Finance", product: "Ariba Procurement Expansion Apps", package: "Premium" },

  { key: "bn_supplier_portal_fin_premium_138", label: "BN Supplier Portal for Finance Premium — Collab + Analytics", days: 138,
    function: "Finance", product: "SAP Business Network", package: "Supplier Portal (Fin Premium)" },

  { key: "central_invoice_mgmt_123", label: "SAP Ariba Central Invoice Management", days: 123,
    function: "Finance", product: "SAP Ariba", package: "Central Invoice Mgmt" },

  { key: "esm_enterprise_service_req_129", label: "Enterprise Service Request Management", days: 129,
    function: "Finance", product: "SAP Enterprise Service Mgmt", package: "Premium" },

  // ========= SCM =========
  { key: "scm_base_idea_to_market_134", label: "Idea to Market (Core PLM & design)", days: 134,
    function: "SCM", product: "SAP SCM", package: "SCM Base" },

  { key: "scm_base_plan_to_fulfil_257", label: "Plan to Fulfil (Planning→Mfg→Delivery)", days: 257,
    function: "SCM", product: "SAP SCM", package: "SCM Base" },

  { key: "scm_base_acquire_to_decom_134", label: "Acquire to Decommission (Asset Mgmt Core)", days: 134,
    function: "SCM", product: "SAP SCM", package: "SCM Base" },

  { key: "scm_base_extend_automate_0", label: "Extend & Automate (low-code/pro-code/GenAI)", days: 0,
    function: "SCM", product: "SAP Build/Automation", package: "SCM Base" },

  { key: "scm_premium_idea_to_market_129", label: "Idea to Market — 3rd-party PLM integration", days: 129,
    function: "SCM", product: "SAP SCM", package: "SCM Premium" },

  { key: "scm_premium_sustainability_386", label: "Sustainability Suite (EHS, Risk, Compliance, Footprint, etc.)", days: 386,
    function: "SCM", product: "SAP Sustainability", package: "SCM Premium" },

  { key: "scm_addons_asset_field_138", label: "Asset Mgmt & Field Service (APM, Mobile, FSM)", days: 138,
    function: "SCM", product: "SAP APM / FSM", package: "SCM Add-Ons" },

  { key: "scm_addons_mfg_execution_180", label: "Manufacturing Execution (SAP Digital Manufacturing)", days: 180,
    function: "SCM", product: "SAP Digital Manufacturing", package: "SCM Add-Ons" },

  { key: "scm_addons_supply_plan_206", label: "Supply Chain Planning (SAP IBP)", days: 206,
    function: "SCM", product: "SAP IBP", package: "SCM Add-Ons" },

  // ========= HCM =========
  { key: "hcm_core_hr_180", label: "Core HR", days: 180,
    function: "HCM", product: "SAP SuccessFactors", package: "SAP Core HR (Entry Point)" },

  { key: "hcm_time_tracking_81", label: "Time Tracking", days: 81,
    function: "HCM", product: "SAP SuccessFactors", package: "SAP Core HR (Entry Point)" },

  { key: "hcm_payroll_213", label: "Payroll", days: 213,
    function: "HCM", product: "SAP SuccessFactors", package: "SAP Core HR (Entry Point)" },

  { key: "hcm_extend_automate_0", label: "Extend & Automate (Low-code/Pro-code/AI)", days: 0,
    function: "HCM", product: "SAP Build/Automation", package: "SAP Core HR (Entry Point)" },

  { key: "hcm_learning_64", label: "Learning (AI-driven)", days: 64,
    function: "HCM", product: "SAP SuccessFactors", package: "Learning & Career Development Add-On" },

  { key: "hcm_career_dev_51", label: "Career Development", days: 51,
    function: "HCM", product: "SAP SuccessFactors", package: "Learning & Career Development Add-On" },

  { key: "hcm_compensation_71", label: "Compensation", days: 71,
    function: "HCM", product: "SAP SuccessFactors", package: "Pay for Performance Add-On" },

  { key: "hcm_performance_goals_57", label: "Performance & Goals", days: 57,
    function: "HCM", product: "SAP SuccessFactors", package: "Pay for Performance Add-On" },

  { key: "hcm_onboarding_51", label: "Onboarding", days: 51,
    function: "HCM", product: "SAP SuccessFactors", package: "Talent Acquisition Add-On" },

  { key: "hcm_recruiting_64", label: "Recruiting", days: 64,
    function: "HCM", product: "SAP SuccessFactors", package: "Talent Acquisition Add-On" },

  // ========= ARIBA =========
  { key: "ariba_sourcing_64", label: "Sourcing", days: 64,
    function: "ARIBA", product: "SAP Ariba", package: "Strategic Procurement (Entry Point)" },

  { key: "ariba_contracts_64", label: "Contracts", days: 64,
    function: "ARIBA", product: "SAP Ariba", package: "Strategic Procurement (Entry Point)" },

  { key: "ariba_supplier_lifecycle_64", label: "Supplier Lifecycle & Performance", days: 64,
    function: "ARIBA", product: "SAP Ariba", package: "Strategic Procurement (Entry Point)" },

  { key: "ariba_supplier_risk_90", label: "Supplier Risk", days: 90,
    function: "ARIBA", product: "SAP Ariba", package: "Strategic Procurement Add-Ons – Upsell" },

  { key: "ariba_spend_control_77", label: "Spend Control Tower", days: 77,
    function: "ARIBA", product: "SAP Ariba", package: "Strategic Procurement Add-Ons – Upsell" },

  { key: "ariba_category_mgt_90", label: "Category Management", days: 90,
    function: "ARIBA", product: "SAP Ariba", package: "Strategic Procurement Add-Ons – Upsell" },

  { key: "ariba_public_e_tendering_51", label: "Public Sector E-tendering", days: 51,
    function: "ARIBA", product: "SAP Ariba", package: "Industry-Specific Add-Ons" },

  // ========= CX =========
  { key: "cx_service_cloud_138", label: "Service Cloud — Omnichannel Service", days: 138,
    function: "CX", product: "SAP CX", package: "Service Excellence" },

  { key: "cx_field_service_129", label: "Field Service Management", days: 129,
    function: "CX", product: "SAP CX", package: "Service Excellence" },

  { key: "cx_asset_manager_116", label: "Asset Manager (Mobile)", days: 116,
    function: "CX", product: "SAP CX", package: "Service Excellence" },

  { key: "cx_b2b_hub_103", label: "B2B Hub (Self-Service Portal)", days: 103,
    function: "CX", product: "SAP CX", package: "B2B Omni-Channel & Promotion" },

  { key: "cx_emarsys_b2b_127", label: "Emarsys (Customer Engagement) — B2B", days: 127,
    function: "CX", product: "Emarsys", package: "B2B Omni-Channel & Promotion" },

  { key: "cx_cdp_b2b_90", label: "Customer Data Platform — B2B", days: 90,
    function: "CX", product: "SAP CX", package: "B2B Omni-Channel & Promotion" },

  { key: "cx_commerce_v2_129", label: "Commerce Cloud v2 — B2C", days: 129,
    function: "CX", product: "SAP CX", package: "B2C Omni-Channel Customer Engagement" },

  { key: "cx_emarsys_b2c_127", label: "Emarsys (Customer Engagement) — B2C", days: 127,
    function: "CX", product: "Emarsys", package: "B2C Omni-Channel Customer Engagement" },

  { key: "cx_cdp_b2c_90", label: "Customer Data Platform — B2C", days: 90,
    function: "CX", product: "SAP CX", package: "B2C Omni-Channel Customer Engagement" },

  // CX Add-Ons
  { key: "cx_sales_cloud_138", label: "Sales Cloud (Add-On)", days: 138,
    function: "CX", product: "SAP CX", package: "CX Add Ons" },

  { key: "cx_service_cloud_add_129", label: "Service Cloud (Additional workspace)", days: 129,
    function: "CX", product: "SAP CX", package: "CX Add Ons" },

  { key: "cx_commerce_v2_add_131", label: "Commerce Cloud v2 (In-store/Web/Mobile)", days: 131,
    function: "CX", product: "SAP CX", package: "CX Add Ons" },

  { key: "cx_emarsys_add_127", label: "Emarsys — Personalization & Journeys", days: 127,
    function: "CX", product: "Emarsys", package: "CX Add Ons" },

  { key: "cx_esm_131", label: "Enterprise Service Management (Self-service portals)", days: 131,
    function: "CX", product: "SAP ESM", package: "CX Add Ons" },
];

/* ========= Function (LoB) tabs ========= */
const LOB_ORDER = ["Finance","SCM","HCM","ARIBA","CX"];
const LOB_ICONS = { Finance:"💠", SCM:"🏭", HCM:"👤", ARIBA:"🧩", CX:"🛎️" };
const lobOf = (cap) => cap.function || "Finance";

/* Malaysia multipliers default = 1.00 */
const DEFAULT_MY_MULTIPLIERS = Object.fromEntries(SG_CAPS.map(c => [c.key, 1]));

/* ========= Bundle logic ========= */
const isBundle = (cap) => !!cap.bundle;
const bundleScopes = Object.fromEntries(
  SG_CAPS.filter(isBundle).map(b => [b.key, { function: b.function, product: b.product, package: b.package }])
);
const isInBundleScope = (cap, bundleKey) => {
  const s = bundleScopes[bundleKey];
  if (!s) return false;
  return cap.key !== bundleKey &&
         cap.function === s.function &&
         cap.product  === s.product &&
         cap.package  === s.package;
};
const splitSelection = (selectedSet) => {
  const selected = SG_CAPS.filter(c => selectedSet.has(c.key));
  const bundles  = selected.filter(isBundle);
  const bundleKeys = new Set(bundles.map(b=>b.key));
  const atomic   = selected.filter(c => {
    for (const bk of bundleKeys) {
      if (isInBundleScope(c, bk)) return false;
    }
    return true;
  });
  return { bundles, atomic };
};

/* ========= Preset seeds ========= */
const ESSENTIAL_MIN_KEYS = new Set([
  "fin_master_data_mgt",
  "p2p_inv_acct",
  "sales_service",
  "gl_general_ledger", "aa_asset_acct", "pay_processing", "open_item_mgt"
]);
const STANDARD_EXTRA_KEYS = new Set(["drc_tax","collections","credit"]);
const PREMIUM_BASE_BUNDLE = "finance_base_424";
const PREMIUM_EXTRA_KEYS = new Set([
  "sales_cloud_lead_to_forecast_193",
  "ariba_expansion_apps_129",
  "central_invoice_mgmt_123",
  "prm_project_sched_129"
]);

/* ---------- Reusable UI bits ---------- */
const Num = ({ value }) => <span className="font-mono">{Number(value).toLocaleString()}</span>;
const Toggle = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-11 h-6 rounded-full p-0.5 transition ${checked ? "bg-blue-600" : "bg-slate-300"}`}
    aria-pressed={checked}
  >
    <div className={`h-5 w-5 bg-white rounded-full shadow transition ${checked ? "translate-x-5" : ""}`} />
  </button>
);
function Card({ title, subtitle, children, footer, className = "" }) {
  return (
    <section className={`bg-white border border-slate-200 rounded-2xl shadow-sm ${className}`}>
      {(title || subtitle) && (
        <div className="px-6 pt-5">
          {title && <h2 className="text-[18px] sm:text-lg font-semibold text-slate-800">{title}</h2>}
          {subtitle && <p className="text-[13.5px] sm:text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="p-6 pt-4">{children}</div>
      {footer && <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">{footer}</div>}
    </section>
  );
}
function Field({ label, value, setValue, step = "1" }) {
  return (
    <label className="text-[14.5px] sm:text-sm w-full">
      <span className="block mb-1 text-slate-600">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => setValue(+e.target.value || 0)}
        className="w-full min-w-[140px] rounded-md border border-slate-300 px-3 py-2 text-right shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}
function SelectField({ label, value, setValue, options }) {
  return (
    <label className="text-[14.5px] sm:text-sm w-full">
      <span className="block mb-1 text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </option>
        ))}
      </select>
    </label>
  );
}
function Range({ label, value, setValue, min = 0, max = 10 }) {
  return (
    <label className="text-[14.5px] sm:text-sm w-full">
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
        onChange={(e) => setValue(+e.target.value)}
        className="w-full accent-blue-600"
      />
    </label>
  );
}

/* --- tiny helpers used in Pro/Quick lists --- */
function Badge({ children }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
      {children}
    </span>
  );
}
const capMatches = (cap, q) => {
  if (!q) return true;
  const s = q.toLowerCase();
  return (cap.label || "").toLowerCase().includes(s)
      || (cap.product || "").toLowerCase().includes(s)
      || (cap.package || "").toLowerCase().includes(s);
};
const countCheckedByFunction = (selectedSet) => {
  const counts = { Finance: 0, SCM: 0, HCM: 0, ARIBA: 0, CX: 0 };
  SG_CAPS.forEach(c => {
    if (selectedSet.has(c.key)) {
      const lob = c.function || "Finance";
      counts[lob] = (counts[lob] || 0) + 1;
    }
  });
  return counts;
};


/* ---------- Export ---------- */
function ExportButtons({ data, filename, summary }) {
  const exportToJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    // helpers
    const N = (v) => (Number.isFinite(+v) ? +v : 0);
    const num = (v) => N(v).toLocaleString("en-MY");
    const rm = (v) =>
      new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 }).format(N(v));

    const s = summary || {};

    // --- Implementation (guarded) ---
    const baseDays   = N(s.baseDays);
    const baseRate   = N(s.baseRate);
    const baseAmount = N(s.baseAmount);
    const finalDays  = N(s.finalDays);
    const finalRate  = N(s.finalRate);
    const rounding   = N(s.rounding);
    const grandTotal = N(s.grandTotal);

    // discount math
    const mandayPct  = N(s.mandayPct);
    const ratePct    = N(s.ratePct);
    const mdAmt      = N(s.mandayDiscountAmount);
    const rtAmt      = N(s.rateDiscountAmount);
    const implSub    = N(s.implementationSubtotal);

    const hasImplDiscount =
      (mandayPct > 0 && mdAmt > 0) || (ratePct > 0 && rtAmt > 0);

    // --- Effort breakdown (days only) ---
    const functionalDays = N(s.functionalDays);
    const fricewDays     = N(s.fricewDays);     // Forms + Interfaces engineering days
    const technicalDays  = N(s.technicalDays);  // additional technical
    const wrapperDays    = N(s.wrapperDays);

    // optional split for wrapper; if not provided, we show a single combined line
    const wrapSaBasisMig = N(
      s.wrapperSaBasisMigrationDays ??
      s.wrapperSaBasisDays ??
      s.wrapperInfraDays
    );
    const wrapPmoEtAl = N(
      s.wrapperPmoCutoverTrainingHypercareDays ??
      s.wrapperPmoDays ??
      s.wrapperSupportDays
    );
    const haveSplitWrapper = wrapSaBasisMig + wrapPmoEtAl > 0;

    // --- AMS (with discount support) ---
    const amsBaseDays   = N(s.amsBaseDays);
    const amsRate       = N(s.amsRate);
    const amsBasePrice  = N(s.amsBasePrice);
    const amsDays       = N(s.amsFinalDays ?? s.amsDays);
    const amsPrice      = N(s.amsFinalPrice ?? s.amsPrice);
    const amsPct        = N(s.amsDiscountPct);
    const amsDaysDelta  = N(s.amsDiscountDaysDelta);
    const amsDiscAmt    = N(s.amsDiscountAmount);
    const hasAMS        = amsPrice > 0;
    const hasAMSDiscount = amsPct > 0 && amsDiscAmt > 0 && amsBaseDays > 0;

    // scope lists
    const capabilities = Array.isArray(s.selectedCapabilities) ? s.selectedCapabilities : [];
    const forms        = Array.isArray(s.selectedForms) ? s.selectedForms : [];
    const interfaces   = ["Bank Interface (Manual Upload)", ...(Array.isArray(s.selectedInterfaces) ? s.selectedInterfaces : [])];

    const warningsBlock =
      Array.isArray(s.warnings) && s.warnings.length
        ? `<div class="note">${s.warnings.map((w) => `<div>• ${w}</div>`).join("")}</div>`
        : "";

    const logoUrl = `${window.location.origin}/abeam-logo.png`;
    const generatedAt = formatDateTime(new Date());

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>ABeam Malaysia — Proposal</title>

  <!-- Mobile & iOS correctness -->
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
  <meta name="format-detection" content="telephone=no, address=no, email=no" />
  <meta name="color-scheme" content="light" />

  <!-- Inter webfont -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  <style>
    :root{
      --ink:#0f172a; --sub:#475569; --line:#e2e8f0; --key:#1d4ed8; --muted:#64748b; --bg:#ffffff;
      --abeam:#0B2F86; /* ABeam brand blue */
    }
    *{ box-sizing:border-box; }

    /* stop iOS/Android auto-inflating text */
    html { -webkit-text-size-adjust:100%; text-size-adjust:100%; }

    body{
      margin:0;
      font-family:Inter, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial;
      color:var(--ink); background:var(--bg);
      -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; text-rendering:optimizeLegibility;
      /* hide until Inter is ready (prevents mismatched sizes in mobile preview) */
      visibility: hidden;
    }
    body.fonts-ready { visibility: visible; }

    /* unified page padding + container alignment */
    .wrap{ padding:40px 48px; }
    .container{ max-width:1200px; margin:0 auto; }

    /* ---- Header (aligned to container) ---- */
    header{ border-bottom:2px solid var(--line); margin-bottom:22px; }
    .header-inner{
      display:flex; align-items:flex-start; justify-content:space-between;
      gap:20px; padding:0 0 18px 0;
    }
    /* Center the logo with the text, and make it a touch larger */
    .brand{ display:flex; align-items:center; gap:16px; min-width:0; }
    .brand img{ height:52px; width:auto; }  /* tweak 52 → 56 if you want it bigger */
    .t1{ font-weight:800; letter-spacing:-.01em; font-size:26px; line-height:1.2; margin:0; }
    .t2{ color:var(--sub); font-size:13px; margin-top:4px; }

    .contacts{ text-align:right; font-size:13px; line-height:1.35; color:var(--ink); max-width:520px; }
    .contacts .co{ font-weight:700; margin-bottom:4px; }
    .contacts a{ color:var(--abeam); text-decoration:none; font-weight:600; }
    .contacts a:hover{ text-decoration:underline; }

    /* ===== Hero ===== */
    /* center the content inside the hero bar */
    .hero{
      background:var(--abeam); color:#fff; border-radius:14px; padding:24px;
      margin:18px 0 26px;
      display:flex;
      justify-content:center;   /* horizontally center */
      align-items:center;       /* vertical centering */
    }
    .hero-inner{
      margin:0 auto;            /* no right-shift */
      text-align:center;        /* center the text */
    }
    .hero .big{ font-size:30px; font-weight:800; margin:0 0 6px; }
    .hero .sub{ font-size:13px; opacity:.9; }

    /* ===== Layout / Cards ===== */
    h3.section{ font-size:17px; margin:26px 0 10px; font-weight:700; letter-spacing:.01em; }
    .grid-2{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    .grid-2-1{ display:grid; grid-template-columns:2fr 1fr; gap:16px; }
    .grid-3{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }

    .card{ border:1px solid var(--line); border-radius:12px; padding:14px; background:#fff; }
    .label{ color:var(--muted); font-size:12px; }
    .value{ font-weight:600; font-size:14px; }

    /* ===== Tables ===== */
    table{ width:100%; border-collapse:collapse; margin-top:10px; }
    th, td{ padding:10px 12px; border-bottom:1px solid var(--line); font-size:13px; }
    th{ text-align:left; color:var(--muted); font-weight:600; letter-spacing:.02em; }
    .right, .text-right{ text-align:right; }
    .row-discount td{ color:#065f46; background:#ecfdf5; }
    .strong td, td.strong{ font-weight:800; }
    .subhead td{ color:var(--muted); font-weight:600; background:#f8fafc; }
    tfoot td{ border-top:2px solid var(--ink); font-weight:800; }

    /* ===== Notes / Footer ===== */
    .note{ margin-top:14px; background:#fffbeb; border:1px solid #f59e0b; color:#92400e; padding:10px 12px; border-radius:10px; font-size:12px; }
    .foot{
      margin-top:28px; padding-top:16px; border-top:1px solid var(--line);
      text-align:center; color:var(--abeam); font-size:14px; font-weight:800;
    }

    /* legacy bottom contact block (kept for completeness) */
    .contact{ margin-top:18px; }
    .contact .addr{ line-height:1.5; font-size:13px; }
    .contact a{ color:var(--key); text-decoration:none; }
    .contact a:hover{ text-decoration:underline; }

    /* ===== Responsive / Print ===== */
    @media print{
      .wrap{ padding:24px 28px; }
      .grid-2, .grid-2-1{ grid-template-columns:1fr 1fr; }
      .grid-3{ grid-template-columns:1fr 1fr 1fr; }
    }
    @media (max-width: 820px){
      .grid-2, .grid-2-1, .grid-3{ grid-template-columns:1fr; }
      .contacts{ text-align:left; max-width:none; }
    }
  </style>

  <!-- Reveal after Inter loads (prevents mismatched sizes in mobile HTML preview) -->
  <script>
    (function () {
      try {
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(function () {
            document.body.classList.add('fonts-ready');
          });
        } else {
          setTimeout(function(){ document.body.classList.add('fonts-ready'); }, 300);
        }
      } catch(e) {
        document.body.classList.add('fonts-ready');
      }
    })();
  </script>
</head>


<body>
<div class="wrap">

  <!-- Header -->
<header>
  <div class="container header-inner">
    <div class="brand">
      <img src="${logoUrl}" alt="ABeam" />
      <div>
        <div class="t1">SAP Cloud ERP Implementation Proposal</div>
        <div class="t2">
          Package: ${String(s.tier || "").toUpperCase()}
          • Industry: ${s.industryTemplate || ""}
          • Generated: ${generatedAt}
        </div>
      </div>
    </div>

    <div class="contacts">
      <div class="co">ABeam Consulting (Malaysia) Sdn. Bhd.</div>
      <div><strong>HQ:</strong> Level 2, KYM Tower, 8, Jalan PJU 7/6, Mutiara Damansara, 47800 PJ, Selangor •
        Tel <a href="tel:+60376601881">+60-3-7660-1881</a></div>
      <div><strong>Penang:</strong> 1-10-01, Menara IJM Land, 1 Lebuh Tunku Kudin 3, 11700 Gelugor, Penang •
        Tel <a href="tel:+6046569181">+60-4-656-9181</a></div>
    </div>
  </div>
</header>

<div class="container">
  <div class="hero">
    <div class="hero-inner">
      <div class="big">${rm(grandTotal)}</div>
      <div class="sub">
        ${num(finalDays)} mandays • ${num(s.timelineWeeks)} weeks • ${num(s.teamSize)} ABeam Team Members • Utilization ${num(s.utilization)}%
</div>
  </div>
</div>

    <!-- Delivery & Team -->
    <h3 class="section">Delivery & Team</h3>
    <div class="grid-2">
      <div class="card">
        <div class="label">Timeline</div>
        <div class="value">${num(s.timelineWeeks)} weeks (${num(s.timelineMonths)} months)</div>
      </div>
      <div class="card">
        <div class="label">Team & Capacity</div>
        <div class="value">${num(s.teamSize)} FTE • ${num(s.workingDaysPerWeek)} days/week • Utilization ${num(s.utilization)}%</div>
      </div>
    </div>

    <!-- Effort Breakdown (Mandays) -->
    <h3 class="section">Effort Breakdown (Mandays)</h3>
    <table>
      <thead>
        <tr><th>Item</th><th class="right">Qty/Days</th></tr>
      </thead>
      <tbody>
        <tr class="subhead"><td colspan="2">Implementation</td></tr>
        <tr><td>Functional</td><td class="right">${num(functionalDays)} d</td></tr>
        <tr><td>Technical (FRICEW)</td><td class="right">${num(fricewDays + technicalDays)} d</td></tr>

        <tr class="subhead"><td colspan="2">Delivery Wrapper</td></tr>
        ${
          haveSplitWrapper
            ? `
              <tr><td>S&A, BASIS, Migration</td><td class="right">${num(wrapSaBasisMig)} d</td></tr>
              <tr><td>PMO, Cutover, Training, Hypercare</td><td class="right">${num(wrapPmoEtAl)} d</td></tr>
            `
            : `
              <tr><td>S&A, BASIS, Migration, PMO, Cutover, Training, Hypercare</td><td class="right">${num(wrapperDays)} d</td></tr>
            `
        }

        <tr class="strong"><td>Total Implementation Mandays</td><td class="right">${num(finalDays)} d</td></tr>
        ${ hasAMS ? `<tr><td>AMS (3 years)</td><td class="right">${num(amsDays)} d</td></tr>` : `` }
      </tbody>
    </table>

    <!-- Financial Summary -->
    <h3 class="section">Financial Summary</h3>
    <table>
      <thead>
        <tr><th>Item</th><th class="right">Qty/Days</th><th class="right">Rate</th><th class="right">Amount (RM)</th></tr>
      </thead>
      <tbody>
        ${
          hasImplDiscount
            ? `
              <tr>
                <td>Implementation — Base</td>
                <td class="right">${num(baseDays)} d</td>
                <td class="right">RM ${num(baseRate)}</td>
                <td class="right">RM ${num(baseAmount)}</td>
              </tr>
              ${mandayPct > 0 && mdAmt > 0 ? `
                <tr class="row-discount">
                  <td>Less: Manday Discount (${num(mandayPct)}%)</td>
                  <td class="right">→ ${num(s.mandayDaysDelta)} d</td>
                  <td class="right">RM ${num(baseRate)}</td>
                  <td class="right">– RM ${num(mdAmt)}</td>
                </tr>` : ``}
              ${ratePct > 0 && rtAmt > 0 ? `
                <tr class="row-discount">
                  <td>Less: Rate Discount (${num(ratePct)}%)</td>
                  <td class="right">${num(finalDays)} d</td>
                  <td class="right">→ RM ${num(finalRate)}</td>
                  <td class="right">– RM ${num(rtAmt)}</td>
                </tr>` : ``}
              <tr class="strong">
                <td>Implementation Subtotal</td>
                <td class="right">${num(finalDays)} d</td>
                <td class="right">RM ${num(finalRate)}</td>
                <td class="right">RM ${num(implSub)}</td>
              </tr>
            `
            : `
              <tr class="strong">
                <td>Implementation</td>
                <td class="right">${num(finalDays)} d</td>
                <td class="right">RM ${num(finalRate)}</td>
                <td class="right">RM ${num(implSub)}</td>
              </tr>
            `
        }

        ${
          hasAMS
            ? (
                hasAMSDiscount
                  ? `
                    <tr>
                      <td>AMS Bundle (3 years) — Base</td>
                      <td class="right">${num(amsBaseDays)} d</td>
                      <td class="right">RM ${num(amsRate)}</td>
                      <td class="right">RM ${num(amsBasePrice)}</td>
                    </tr>
                    <tr class="row-discount">
                      <td>Less: AMS Discount (${num(amsPct)}%)</td>
                      <td class="right">→ ${num(amsDaysDelta)} d</td>
                      <td class="right">RM ${num(amsRate)}</td>
                      <td class="right">– RM ${num(amsDiscAmt)}</td>
                    </tr>
                    <tr class="strong">
                      <td>AMS Subtotal</td>
                      <td class="right">${num(amsDays)} d</td>
                      <td class="right">RM ${num(amsRate)}</td>
                      <td class="right">RM ${num(amsPrice)}</td>
                    </tr>
                  `
                  : `
                    <tr>
                      <td>AMS Bundle (3 years)</td>
                      <td class="right">${num(amsDays)} d</td>
                      <td class="right">RM ${num(amsRate)}</td>
                      <td class="right">RM ${num(amsPrice)}</td>
                    </tr>
                  `
              )
            : ``
        }
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3">Grand Total</td>
          <td class="right">RM ${num(grandTotal)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="t2" style="margin-top:8px">Rounding step: RM ${num(rounding)}. All figures include configured discounts and rounding.</div>

    <!-- Scope Summary -->
    <h3 class="section">Scope Summary</h3>
    <div class="grid-3">
      <div class="card">
        <div class="label">Selected Capabilities</div>
        <div class="value" style="margin-top:6px; font-weight:500;">
          ${capabilities.length ? capabilities.map(x => `<div>• ${x}</div>`).join("") : "—"}
        </div>
      </div>
      <div class="card">
        <div class="label">Forms</div>
        <div class="value" style="margin-top:6px; font-weight:500;">
          ${forms.length ? forms.map(x => `<div>• ${x}</div>`).join("") : "—"}
        </div>
      </div>
      <div class="card">
        <div class="label">Interfaces</div>
        <div class="value" style="margin-top:6px; font-weight:500;">
          ${interfaces.map(x => `<div>• ${x}</div>`).join("")}
        </div>
      </div>
    </div>

    ${warningsBlock}

<div class="foot" style="text-align:center;">
  <span style="color:#0B2F86; font-weight:800; font-size:16px; letter-spacing:.01em;">
    Thank you for your interest. The estimates are indicative and will be refined collaboratively. We look forward to working with you.
  </span>
</div>
  </div>
</div>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => { try { w.print(); } catch (e) {} }, 400);
    } else {
      // popup blocked fallback
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <button
        onClick={exportToPDF}
        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Generate Proposal (PDF)
      </button>
      <button
        onClick={exportToJSON}
        className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition"
      >
        Save Config (JSON)
      </button>
    </div>
  );
}



/* =============================== Main App =============================== */
export default function App() {
  /* Modes */
  const [mode, setMode] = useState("quick"); // "quick" | "pro"

  /* Core State */
  const [tier, setTier] = useState("essential");
  const [industryTemplate, setIndustryTemplate] = useState("none");

  /* Tabs + search (Pro) */
  const [activeLob, setActiveLob] = useState("Finance");
  const [capSearch, setCapSearch] = useState("");

  /* Functional */
  const [selectedCaps, setSelectedCaps] = useState(new Set(["fin_master_data_mgt","p2p_inv_acct","sales_service","gl_general_ledger","aa_asset_acct","pay_processing","open_item_mgt"]));
  const [includeDRC, setIncludeDRC] = useState(false);
  const [myMultipliers, setMyMultipliers] = useState(DEFAULT_MY_MULTIPLIERS);
  const [capDays, setCapDays] = useState(Object.fromEntries(SG_CAPS.map(c => [c.key, c.days || 0])));

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
  const [rounding, setRounding] = useState(DEFAULT_ROUNDING);

  /* Team / Timeline */
  const [teamSize, setTeamSize] = useState(5);
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState(5);

  /* AMS */
  const [selectedAMS, setSelectedAMS] = useState(null);
  const [amsDiscountPct, setAmsDiscountPct] = useState(15);

  /* Include AMS in total */
  const [includeAMSInTotal, setIncludeAMSInTotal] = useState(false);

  /* Admin override (Pro only) */
  const [adminOverride, setAdminOverride] = useState(false);

  /* QUICK preset override */
  const [quickPresetOverrideOn, setQuickPresetOverrideOn] = useState(false);
  const [presetOverrides, setPresetOverrides] = useState({
  essential: null, standard: null, premium: null
});
// Helpers that apply the current tier respecting the override toggle
const applyTierQuick = (t) =>
  applyTier(t, { useOverrides: quickPresetOverrideOn, overrides: presetOverrides });

const applyTierPro = (t) =>
  applyTier(t, { useOverrides: quickPresetOverrideOn, overrides: presetOverrides });

  // Persist overrides
  useEffect(() => {
    const raw = localStorage.getItem("presetOverrides");
    if (raw) setPresetOverrides(JSON.parse(raw));
  }, []);
  useEffect(() => {
    localStorage.setItem("presetOverrides", JSON.stringify(presetOverrides));
  }, [presetOverrides]);

  /* Guided Presets */
  const applyTier = (t, opts = {}) => {
    const { useOverrides = false, overrides = null } = opts;
    setTier(t);

    const o = overrides && overrides[t];
    if (useOverrides && o && Array.isArray(o.keys)) {
      setSelectedCaps(new Set(o.keys));
      setIncludeDRC(!!o.includeDRC);
      if (o.wrapper) {
        const w = o.wrapper;
        if (Number.isFinite(w.security)) setSecurityDays(w.security);
        if (Number.isFinite(w.tenant))   setTenantOpsDays(w.tenant);
        if (Number.isFinite(w.migrate))  setMigrationCycles(w.migrate);
        if (Number.isFinite(w.pmo))      setPmoDays(w.pmo);
        if (Number.isFinite(w.cutover))  setCutoverDays(w.cutover);
        if (Number.isFinite(w.training)) setTrainingDays(w.training);
        if (Number.isFinite(w.hyper))    setHypercareDays(w.hyper);
      }
      return;
    }

    if (t === "essential") {
      const base = new Set(ESSENTIAL_MIN_KEYS);
      setIncludeDRC(false);
      setSelectedCaps(base);
      setSecurityDays(20); setTenantOpsDays(15); setMigrationCycles(2);
      setPmoDays(55); setCutoverDays(12); setTrainingDays(15); setHypercareDays(15);
    }
    if (t === "standard") {
      const std = new Set([...ESSENTIAL_MIN_KEYS, ...STANDARD_EXTRA_KEYS]);
      setIncludeDRC(true);
      setSelectedCaps(std);
      setSecurityDays(20); setTenantOpsDays(20); setMigrationCycles(3);
      setPmoDays(65); setCutoverDays(15); setTrainingDays(20); setHypercareDays(20);
    }
    if (t === "premium") {
      const p = new Set([PREMIUM_BASE_BUNDLE, ...PREMIUM_EXTRA_KEYS, "drc_tax"]);
      setIncludeDRC(true);
      setSelectedCaps(p);
      setSecurityDays(25); setTenantOpsDays(25); setMigrationCycles(3);
      setPmoDays(75); setCutoverDays(18); setTrainingDays(25); setHypercareDays(25);
    }
  };

  const applyTierWithOverrides = (t) =>
  applyTier(t, { useOverrides: quickPresetOverrideOn, overrides: presetOverrides });

  const applyIndustryTemplate = (template) => {
    setIndustryTemplate(template);
    const cfg = INDUSTRY_TEMPLATES[template];
    const newMultipliers = { ...DEFAULT_MY_MULTIPLIERS };
    Object.entries(cfg.multipliers).forEach(([k,v]) => { newMultipliers[k] = v; });
    setMyMultipliers(newMultipliers);
    setSelectedForms(new Set(cfg.requiredForms));
    setSelectedIfs(new Set(cfg.requiredInterfaces));
  };

  // Keep "includeDRC" UX toggle synchronized with capability set
  useEffect(() => {
    setSelectedCaps(prev => {
      const ns = new Set(prev);
      if (includeDRC) ns.add("drc_tax"); else ns.delete("drc_tax");
      return ns;
    });
  }, [includeDRC]);

  // Seed when switching to quick
  useEffect(() => {
    if (mode === "quick")
      applyTier(tier, { useOverrides: quickPresetOverrideOn, overrides: presetOverrides });
  }, [mode, tier]); // eslint-disable-line

  // Re-apply if overrides change (while toggle ON)
useEffect(() => {
  if (mode === "quick" && quickPresetOverrideOn) {
    applyTier(tier, { useOverrides: true, overrides: presetOverrides });
  }
}, [presetOverrides, quickPresetOverrideOn, mode, tier]);

  /* ===== Calculations ===== */
  const sgSelected = useMemo(() => SG_CAPS.filter(c => selectedCaps.has(c.key)), [selectedCaps]);

  const sgFunctionalDays = useMemo(() => {
    const { bundles, atomic } = splitSelection(selectedCaps);
    const atomicDays = atomic.reduce((a, c) => a + (capDays[c.key] ?? c.days ?? 0), 0);
    const bundleDays = bundles.reduce((a, b) => a + (capDays[b.key] ?? b.days ?? 0), 0);
    return atomicDays + bundleDays;
  }, [selectedCaps, capDays]);

  const sgFunctionalPriceMYR = useMemo(
    () => roundTo((sgFunctionalDays * sgRate * fx), rounding),
    [sgFunctionalDays, sgRate, fx, rounding]
  );

  const myFunctionalDays = useMemo(() => {
    const { bundles, atomic } = splitSelection(selectedCaps);
    const atomicDays = atomic.reduce((a, c) => {
      const d = capDays[c.key] ?? c.days ?? 0;
      const m = myMultipliers[c.key] ?? 1;
      return a + Math.round(d * m);
    }, 0);
    const bundleDays = bundles.reduce((a, b) => {
      const d = capDays[b.key] ?? b.days ?? 0;
      const m = myMultipliers[b.key] ?? 1;
      return a + Math.round(d * m);
    }, 0);
    const tpl = INDUSTRY_TEMPLATES[industryTemplate];
    return Math.round(atomicDays + bundleDays + (tpl?.additionalDays ?? 0));
  }, [selectedCaps, myMultipliers, industryTemplate, capDays]);

  const requiresFinance = useMemo(() => {
    if (adminOverride) return false;
    const hasFinance = SG_CAPS.some(c => selectedCaps.has(c.key) && c.function === "Finance");
    return !hasFinance;
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

  const timelineWeeks  = Math.ceil(myTotalMandays / (Math.max(1, teamSize) * Math.max(1, workingDaysPerWeek)));
  const timelineMonths = Math.round((timelineWeeks / 4.33) * 10) / 10;
  const capacityMandays = Math.max(1, teamSize) * Math.max(1, workingDaysPerWeek) * Math.max(1, timelineWeeks);
  const utilizationPct = Math.min(100, Math.round((myTotalMandays / capacityMandays) * 100));


const amS = useMemo(() => {
  if (!selectedAMS) return { days: 0, price: 0, baseDays: 0, basePrice: 0 };
  const opt = AMS_CHOICES.find(a => a.key === selectedAMS);
  const baseDays = opt.daysPerYear * 3;
  const discountedDays = Math.round(baseDays * (1 - amsDiscountPct / 100));
  const basePrice = roundTo(baseDays * amsRate, rounding);
  const price = roundTo(discountedDays * amsRate, rounding);
  return { days: discountedDays, price, baseDays, basePrice };
}, [selectedAMS, amsDiscountPct, amsRate, rounding]);

  const grandTotal = myProjectPrice + (includeAMSInTotal ? amS.price : 0);

  const warnings = [];
  if (requiresFinance) warnings.push("At least one Finance capability is recommended across bundles or items.");
  if (allowMandayDiscount && mandayDiscountPct > MAX_MANDAY_DISCOUNT) warnings.push(`Manday discount ${mandayDiscountPct}% exceeds policy cap of ${MAX_MANDAY_DISCOUNT}%. Approval required.`);
  if (rateDiscountPct > MAX_RATE_DISCOUNT) warnings.push(`Rate discount ${rateDiscountPct}% exceeds policy cap of ${MAX_RATE_DISCOUNT}%. Approval required.`);
  if (wrapperDays < 40) warnings.push("Wrapper effort looks low — PMO/Training/Hypercare may be under-scoped.");
  if (riskMultiplier > 1.3) warnings.push("High risk factors detected — consider contingency.");
  if (myTotalMandays > 800) warnings.push("Large scope — consider phased approach.");
  if (timelineWeeks > 30) warnings.push("Timeline exceeds 30 weeks — resource constraints possible.");

  const exportData = {
    configuration: {
      mode, tier, industryTemplate, adminOverride, rounding,
      selectedCaps: Array.from(selectedCaps),
      selectedForms: Array.from(selectedForms),
      selectedIfs: Array.from(selectedIfs),
      riskFactors: { clientType, migrationType, timelineType, complexityLevel },
      rates: { sgRate, fx, myRate, amsRate },
      discounts: { manday: mandayDiscountPct, rate: rateDiscountPct, ams: amsDiscountPct },
      includeAMSInTotal
    },
    calculations: {
      functionalDays: myFunctionalDays,
      fricewDays: formsDays + ifDays,
      technicalDays, wrapperDays,
      totalMandays: myTotalMandays,
      projectRate: myProjectRate,
      projectPrice: myProjectPrice,
      grandTotal,
      timeline: { weeks: timelineWeeks, months: timelineMonths },
      riskMultiplier
    },
    timestamp: new Date().toISOString()
  };

// --- Derived figures for a clean PDF breakdown ---
const baseDays = myTotalMandaysWithRisk;               // before any discount
const baseRate = myRate;                                // before rate discount
const finalDays = myTotalMandays;                       // after manday discount
const finalRate = myProjectRate;                        // after rate discount

const mandayPct = allowMandayDiscount ? Number(mandayDiscountPct) : 0;
const ratePct   = Number(rateDiscountPct);

const mandayDaysDelta = Math.max(0, baseDays - finalDays);     // days reduced by manday discount
const ratePerDayDelta = Math.max(0, baseRate - finalRate);     // rate reduced by rate discount

const baseAmount             = roundTo(baseDays * baseRate, rounding);
const mandayDiscountAmount   = roundTo(mandayDaysDelta * baseRate, rounding);
const rateDiscountAmount     = roundTo(ratePerDayDelta * finalDays, rounding);
const implementationSubtotal = roundTo(baseAmount - mandayDiscountAmount - rateDiscountAmount, rounding);
const grandTotalPDF          = roundTo(implementationSubtotal + (includeAMSInTotal ? amS.price : 0), rounding);

// capacity + utilization for PDF (renamed to avoid collisions)
const pdfCapacityMandays = Math.max(1, teamSize) * Math.max(1, workingDaysPerWeek) * Math.max(1, timelineWeeks);
const pdfUtilizationPct  = Math.min(100, Math.round((myTotalMandays / pdfCapacityMandays) * 100));

// --- AMS base vs final (for PDF breakdown) ---
const amsBaseDays = selectedAMS
  ? (AMS_CHOICES.find(a => a.key === selectedAMS)?.daysPerYear || 0) * 3
  : 0;
const amsBasePrice = roundTo(amsBaseDays * amsRate, rounding);
const amsDiscountDaysDelta = Math.max(0, amsBaseDays - (amS.days || 0));
const amsDiscountAmount    = Math.max(0, amsBasePrice - (amS.price || 0));


const pdfSummary = {
  // context
  tier,
  industryTemplate: INDUSTRY_TEMPLATES[industryTemplate].name,

  // timeline + team
  timelineWeeks,
  timelineMonths,
  teamSize,
  workingDaysPerWeek,
  utilization: utilizationPct,

  // effort breakdown
  functionalDays: myFunctionalDays,
  fricewDays: formsDays + ifDays,
  technicalDays,
  wrapperDays,

  // pricing (final)
  projectRate: finalRate,
  projectPrice: myProjectPrice,
  amsDays: amS.days,
  amsPrice: amS.price,
  includeAMSInTotal,

  // before/after for math
  baseDays,
  baseRate,
  baseAmount,
  finalDays,
  finalRate,

  // discounts
  mandayPct,
  ratePct,
  mandayDaysDelta,
  ratePerDayDelta,
  mandayDiscountAmount,
  rateDiscountAmount,

  // totals
  implementationSubtotal,
  grandTotal: grandTotalPDF,
  rounding,
  
  amsRate,                 // per-day rate used for AMS
  amsDiscountPct: amsDiscountPct,  // the % from your AMS control
  amsBaseDays,             // before discount
  amsBasePrice,            // before discount
  amsFinalDays: amS.days,  // after discount
  amsFinalPrice: amS.price,
  amsDiscountDaysDelta,    // days removed by discount
  amsDiscountAmount,       // RM reduced by discount
  // refs
  sgFunctionalDays,
  sgFunctionalPriceMYR: Math.round(sgFunctionalPriceMYR),
  riskMultiplier,
  warnings,
  selectedCapabilities: SG_CAPS.filter(c => selectedCaps.has(c.key)).map(c => c.label),
  selectedForms: FORMS.filter(f => selectedForms.has(f.key)).map(f => f.label),
  selectedInterfaces: INTERFACES.filter(i => selectedIfs.has(i.key)).map(i => i.label),
};


  /* =============== UI =============== */
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/abeam-logo.png" alt="ABeam Consulting" className="h-7 w-auto" />
            <div className="truncate">
              <h1 className="text-[16px] sm:text-lg font-semibold tracking-tight text-slate-900 truncate">
                ABeam Malaysia — Cloud ERP Calculator
              </h1>
              <p className="text-[12.5px] sm:text-xs text-slate-500 hidden sm:block">Quick estimates for execs. Pro controls for consultants.</p>
            </div>
          </div>

          {/* Mode Switch */}
          <div className="flex rounded-full border border-slate-300 p-0.5 bg-slate-100 shrink-0">
            <button
              className={`px-3 py-1.5 rounded-full text-[14.5px] sm:text-sm ${mode === "quick" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-white"}`}
              onClick={() => setMode("quick")}
              aria-pressed={mode === "quick"}
            >
              Quick
            </button>
            <button
              className={`px-3 py-1.5 rounded-full text-[14.5px] sm:text-sm ${mode === "pro" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-white"}`}
              onClick={() => setMode("pro")}
              aria-pressed={mode === "pro"}
            >
              Pro
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      {mode === "quick" ? (
        <QuickMode
          tier={tier}
          setTier={setTier}
          industryTemplate={industryTemplate}
          applyIndustryTemplate={applyIndustryTemplate}
          selectedAMS={selectedAMS}
          setSelectedAMS={setSelectedAMS}
          amsDiscountPct={amsDiscountPct}
          setAmsDiscountPct={setAmsDiscountPct}
          amsRate={amsRate}
          setAmsRate={setAmsRate}
          teamSize={teamSize}
          setTeamSize={setTeamSize}
          workingDaysPerWeek={workingDaysPerWeek}
          setWorkingDaysPerWeek={setWorkingDaysPerWeek}
          myProjectPrice={myProjectPrice}
          myTotalMandays={myTotalMandays}
          timelineWeeks={timelineWeeks}
          timelineMonths={timelineMonths}
          exportData={exportData}
          pdfSummary={pdfSummary}
          amS={amS}
          includeAMSInTotal={includeAMSInTotal}
          setIncludeAMSInTotal={setIncludeAMSInTotal}
          quickPresetOverrideOn={quickPresetOverrideOn}
          setQuickPresetOverrideOn={setQuickPresetOverrideOn}
          presetOverrides={presetOverrides}
          setPresetOverrides={setPresetOverrides}
          selectedCaps={selectedCaps}
          includeDRC={includeDRC}
          wrapper={{ securityDays, tenantOpsDays, migrationCycles, pmoDays, cutoverDays, trainingDays, hypercareDays }}
          applyTierWithOverrides={applyTierWithOverrides}
        />
      ) : (
        <ProMode
          activeLob={activeLob} setActiveLob={setActiveLob}
          capSearch={capSearch} setCapSearch={setCapSearch}
          selectedCaps={selectedCaps} setSelectedCaps={setSelectedCaps}
          includeDRC={includeDRC} setIncludeDRC={setIncludeDRC}
          myMultipliers={myMultipliers} setMyMultipliers={setMyMultipliers}
          adminOverride={adminOverride} setAdminOverride={setAdminOverride}
          capDays={capDays} setCapDays={setCapDays}
          industryTemplate={industryTemplate} applyIndustryTemplate={applyIndustryTemplate}
          tier={tier} applyTier={(t)=>applyTier(t,{useOverrides:false})}
          securityDays={securityDays} setSecurityDays={setSecurityDays}
          tenantOpsDays={tenantOpsDays} setTenantOpsDays={setTenantOpsDays}
          migrationCycles={migrationCycles} setMigrationCycles={setMigrationCycles}
          pmoDays={pmoDays} setPmoDays={setPmoDays}
          cutoverDays={cutoverDays} setCutoverDays={setCutoverDays}
          trainingDays={trainingDays} setTrainingDays={setTrainingDays}
          hypercareDays={hypercareDays} setHypercareDays={setHypercareDays}
          selectedForms={selectedForms} setSelectedForms={setSelectedForms}
          selectedIfs={selectedIfs} setSelectedIfs={setSelectedIfs}
          sgRate={sgRate} setSgRate={setSgRate}
          fx={fx} setFx={setFx}
          myRate={myRate} setMyRate={setMyRate}
          amsRate={amsRate} setAmsRate={setAmsRate}
          rounding={rounding} setRounding={setRounding}
          allowMandayDiscount={allowMandayDiscount} setAllowMandayDiscount={setAllowMandayDiscount}
          mandayDiscountPct={mandayDiscountPct} setMandayDiscountPct={setMandayDiscountPct}
          rateDiscountPct={rateDiscountPct} setRateDiscountPct={setRateDiscountPct}
          clientType={clientType} setClientType={setClientType}
          migrationType={migrationType} setMigrationType={setMigrationType}
          timelineType={timelineType} setTimelineType={setTimelineType}
          complexityLevel={complexityLevel} setComplexityLevel={setComplexityLevel}
          selectedAMS={selectedAMS} setSelectedAMS={setSelectedAMS}
          amsDiscountPct={amsDiscountPct} setAmsDiscountPct={setAmsDiscountPct}
          includeAMSInTotal={includeAMSInTotal} setIncludeAMSInTotal={setIncludeAMSInTotal}
          sgFunctionalDays={sgFunctionalDays}
          sgFunctionalPriceMYR={Math.round(sgFunctionalPriceMYR)}
          myFunctionalDays={myFunctionalDays}
          formsDays={formsDays} ifDays={ifDays}
          technicalDays={technicalDays} wrapperDays={wrapperDays}
          riskMultiplier={riskMultiplier}
          myTotalMandays={myTotalMandays}
          myProjectRate={myProjectRate}
          myProjectPrice={myProjectPrice}
          timelineWeeks={timelineWeeks} timelineMonths={timelineMonths}
          warnings={warnings}
          amS={amS}
          exportData={exportData} pdfSummary={pdfSummary}
          applyTierWithOverrides={applyTierWithOverrides}
          teamSize={teamSize}
          setTeamSize={setTeamSize}
          workingDaysPerWeek={workingDaysPerWeek}
          setWorkingDaysPerWeek={setWorkingDaysPerWeek}
        />
      )}
    </div>
  );
}

/* =============== Quick Mode =============== */
function QuickMode(props) {
  const {
    tier, setTier,
    industryTemplate, applyIndustryTemplate,
    selectedAMS, setSelectedAMS, amsDiscountPct, setAmsDiscountPct, amsRate, setAmsRate,
    teamSize, setTeamSize, workingDaysPerWeek, setWorkingDaysPerWeek,
    myProjectPrice, myTotalMandays, timelineWeeks, timelineMonths,
    exportData, pdfSummary,
    amS, includeAMSInTotal, setIncludeAMSInTotal,
    quickPresetOverrideOn, setQuickPresetOverrideOn, presetOverrides, setPresetOverrides, applyTierWithOverrides,
    selectedCaps, includeDRC, wrapper
  } = props;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-6">
        <Card title="Pick Your Context" subtitle="Three choices only. We auto-optimize everything else.">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Industry */}
            <div className="space-y-2">
              <div className="text-[14.5px] sm:text-sm font-medium text-slate-700 mb-1">Industry Template</div>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(INDUSTRY_TEMPLATES).map(([key, template]) => (
                  <button
                    key={key}
                    className={`px-3 py-2 rounded-lg border text-left transition ${
                      industryTemplate === key ? "border-blue-600 bg-blue-50" : "border-slate-300 hover:bg-slate-50"
                    }`}
                    onClick={() => applyIndustryTemplate(key)}
                  >
                    <div className="text-[14.5px] sm:text-sm font-medium">{template.name}</div>
                    <div className="text-[12.5px] sm:text-xs text-slate-500">{template.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tier */}
            <div className="space-y-2">
              <div className="text-[14.5px] sm:text-sm font-medium text-slate-700 mb-1">Package Tier</div>
              <div className="flex flex-col gap-2">
                {["essential","standard","premium"].map(t => (
                <button
                  key={t}
                  className={`px-3 py-2 rounded-lg border transition ${
                    tier === t ? "border-blue-600 bg-blue-50" : "border-slate-300 hover:bg-slate-50"
                  }`}
                  onClick={() => applyTierWithOverrides(t)}
                >
                    <div className="text-[14.5px] sm:text-sm font-medium">{t[0].toUpperCase()+t.slice(1)}</div>
                    <div className="text-[12.5px] sm:text-xs text-slate-500">
                      {t === "essential" && "Minimal core finance (DRC optional)"}
                      {t === "standard" && "Essential + DRC + Collections + Credit"}
                      {t === "premium" && "Finance Base bundle + premium adds"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* AMS */}
            <div className="space-y-2">
              <div className="text-[14.5px] sm:text-sm font-medium text-slate-700 mb-1">AMS (optional)</div>
              <div className="space-y-2">
                {AMS_CHOICES.map(a => (
                  <label key={a.key} className={`flex items-center justify-between rounded-lg border p-2 ${selectedAMS === a.key ? "border-blue-600 bg-blue-50" : "border-slate-300 hover:bg-slate-50"}`}>
                    <div className="flex items-center gap-2">
                      <input type="radio" name="ams" checked={selectedAMS === a.key} onChange={() => setSelectedAMS(a.key)} />
                      <span className="text-[14.5px] sm:text-sm">{a.label}</span>
                    </div>
                    <span className="text-[12.5px] sm:text-xs text-slate-500">{a.daysPerYear}d/yr</span>
                  </label>
                ))}
                <label className={`flex items-center justify-between rounded-lg border p-2 ${!selectedAMS ? "border-blue-600 bg-blue-50" : "border-slate-300 hover:bg-slate-50"}`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="ams" checked={!selectedAMS} onChange={() => setSelectedAMS(null)} />
                    <span className="text-[14.5px] sm:text-sm">No AMS bundle</span>
                  </div>
                </label>
                {selectedAMS && (
                  <div className="grid grid-cols-2 gap-2">
                    <Range label="AMS Discount" value={amsDiscountPct} setValue={setAmsDiscountPct} min={0} max={25} />
                    <Field label="AMS Rate (RM/day)" value={amsRate} setValue={setAmsRate} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Delivery */}
        <Card title="Delivery Tempo" subtitle="We’ll compute an achievable timeline and utilization.">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Team Size (FTE)" value={teamSize} setValue={setTeamSize} />
            <Field label="Working Days/Week" value={workingDaysPerWeek} setValue={setWorkingDaysPerWeek} />
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <div className="text-[14.5px] sm:text-sm text-slate-600">Estimated Timeline</div>
              <div className="text-[18px] sm:text-lg font-semibold">{timelineWeeks} weeks</div>
              <div className="text-[12.5px] sm:text-xs text-slate-600">{timelineMonths} months</div>
            </div>
          </div>
        </Card>

        {/* Tier overrides (Admin) */}
        <Card title="Tier overrides (Admin)">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2">
              <Toggle checked={quickPresetOverrideOn} onChange={setQuickPresetOverrideOn} />
              <span className="text-[14.5px] sm:text-sm text-slate-700">Enable custom overrides</span>
            </label>
            <span className="text-[12.5px] sm:text-xs text-slate-500">
              Saved:&nbsp;
              {Object.entries(presetOverrides)
                .filter(([,v]) => !!v)
                .map(([k]) => k)
                .join(", ") || "None"}
            </span>
          </div>
        </Card>

        {quickPresetOverrideOn && (
          <PresetOverridesEditor
            tier={tier}
            setTier={setTier}
            presetOverrides={presetOverrides}
            setPresetOverrides={setPresetOverrides}
            onApply={() => applyTierWithOverrides(tier)}
          />
        )}
      </div>

      {/* Summary */}
      <aside className="lg:col-span-4">
        <div className="sticky top-20 space-y-3">
          <Card title="Summary" subtitle="Live preview">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[14.5px] sm:text-sm text-slate-700">Total Mandays</span>
                <span className="text-base font-semibold"><Num value={myTotalMandays} /> d</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[14.5px] sm:text-sm text-slate-700">Project Price</span>
                <span className="text-[20px] sm:text-lg font-bold text-slate-900">RM <Num value={myProjectPrice} /></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[14.5px] sm:text-sm text-slate-700">AMS (3y)</span>
                <span className="text-[14.5px] sm:text-sm font-medium">RM <Num value={amS.price} /> <span className="text-[12.5px] sm:text-xs text-slate-500">({amS.days} d)</span></span>
              </div>
              <label className="flex items-center justify-between rounded-md border border-slate-200 p-2">
                <span className="text-[14.5px] sm:text-sm text-slate-700">Include AMS in total</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={includeAMSInTotal}
                  onChange={(e) => setIncludeAMSInTotal(e.target.checked)}
                />
              </label>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 mt-2">
                <span className="text-[14.5px] sm:text-sm text-slate-700">Grand Total</span>
                <span className="text-[20px] sm:text-lg font-extrabold text-slate-900">
                  RM <Num value={myProjectPrice + (includeAMSInTotal ? amS.price : 0)} />
                </span>
              </div>
            </div>

            <div className="mt-4">
              <ExportButtons
                data={exportData}
                filename={`abeam-quick-${new Date().toISOString().split('T')[0]}`}
                summary={pdfSummary}
              />
            </div>
          </Card>
        </div>
      </aside>


    </main>
  );
}

function CompactField({ label, value, setValue, step = "1" }) {
  return (
    <label className="text-[13.5px] sm:text-[13px] w-full">
      <div className="mb-1 text-slate-600">{label}</div>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => setValue(+e.target.value || 0)}
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-right
                   focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}

function PresetOverridesEditor({
  tier,
  setTier,
  presetOverrides,
  setPresetOverrides,
  onApply,
}) {
  const [activePreset, setActivePreset] = React.useState("essential");
  const [activeLob, setActiveLob] = React.useState("Finance");
  const [q, setQ] = React.useState("");

  const ov = presetOverrides[activePreset] || { keys: [], includeDRC: false, wrapper: {} };
  const keysSet = React.useMemo(() => new Set(ov.keys || []), [ov.keys]);

  const w = ov.wrapper || {};
  const [wLocal, setWLocal] = React.useState({
    security: w.security ?? 20,
    tenant:   w.tenant   ?? 15,
    migrate:  w.migrate  ?? 2,
    pmo:      w.pmo      ?? 55,
    cutover:  w.cutover  ?? 12,
    training: w.training ?? 15,
    hyper:    w.hyper    ?? 15,
  });

  React.useEffect(() => {
    const nw = (presetOverrides[activePreset]?.wrapper) || {};
    setWLocal({
      security: nw.security ?? 20,
      tenant:   nw.tenant   ?? 15,
      migrate:  nw.migrate  ?? 2,
      pmo:      nw.pmo      ?? 55,
      cutover:  nw.cutover  ?? 12,
      training: nw.training ?? 15,
      hyper:    nw.hyper    ?? 15,
    });
  }, [activePreset, presetOverrides]);

  const persist = (nextKeysSet, next = {}) => {
    setPresetOverrides(prev => ({
      ...prev,
      [activePreset]: {
        ...(prev[activePreset] || {}),
        ...next,
        keys: Array.from(nextKeysSet ?? keysSet),
      }
    }));
  };
  const toggleCap = (k) => {
    const ns = new Set(keysSet);
    ns.has(k) ? ns.delete(k) : ns.add(k);
    persist(ns);
  };

  const list = React.useMemo(
    () => SG_CAPS.filter(c => (c.function || "Finance") === activeLob && capMatches(c, q)),
    [activeLob, q]
  );
  const selectedInView = React.useMemo(
    () => list.filter(c => keysSet.has(c.key)),
    [list, keysSet]
  );

  const lobCounts = React.useMemo(() => {
    const counts = { Finance: 0, SCM: 0, HCM: 0, ARIBA: 0, CX: 0 };
    (ov.keys || []).forEach(k => {
      const c = SG_CAPS.find(x => x.key === k);
      if (!c) return;
      const lob = c.function || "Finance";
      counts[lob] = (counts[lob] || 0) + 1;
    });
    return counts;
  }, [ov.keys]);

  const selectAllFiltered = () => {
    const ns = new Set(keysSet);
    list.forEach(c => ns.add(c.key));
    persist(ns);
  };
  const clearFiltered = () => {
    const toRemove = new Set(list.map(c => c.key));
    const ns = new Set([...keysSet].filter(k => !toRemove.has(k)));
    persist(ns);
  };

  const savedLabel = Object.entries(presetOverrides)
    .filter(([,v]) => !!v && (v.keys?.length || v.wrapper || v.includeDRC !== undefined))
    .map(([k]) => k)
    .join(", ") || "None";

  return (
    <Card title="Preset Overrides — Editor" subtitle="Curate bundles for Essential / Standard / Premium.">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">
          {["essential","standard","premium"].map((p) => {
            const saved = presetOverrides[p]?.keys?.length > 0;
            return (
              <button
                key={p}
                className={`px-4 py-2 rounded-md text-[14.5px] sm:text-sm font-medium border transition ${
                  activePreset === p
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
                onClick={() => setActivePreset(p)}
              >
                {p[0].toUpperCase() + p.slice(1)}
                {saved && <span className="ml-2 text-green-600">●</span>}
              </button>
            );
          })}
        </div>
        <div className="text-[12.5px] sm:text-xs text-slate-500">Saved: {savedLabel}</div>
      </div>

      {/* DRC + wrapper */}
      <div className="border rounded-xl p-4 bg-slate-50 mb-5 space-y-4">
        <label className="flex items-center gap-2 text-[14.5px] sm:text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 text-blue-600 border-slate-300 rounded"
            checked={!!ov.includeDRC}
            onChange={(e) => persist(undefined, { includeDRC: e.target.checked })}
          />
          Include DRC (e-Invoice) in this preset
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <CompactField label="Security (d)" value={wLocal.security} setValue={(v) => setWLocal(s => ({ ...s, security: v }))} />
          <CompactField label="Tenant (d)"   value={wLocal.tenant}   setValue={(v) => setWLocal(s => ({ ...s, tenant: v }))} />
          <CompactField label="Migrate (cycles)" value={wLocal.migrate} setValue={(v) => setWLocal(s => ({ ...s, migrate: v }))} step="1" />
          <CompactField label="PMO (d)"      value={wLocal.pmo}      setValue={(v) => setWLocal(s => ({ ...s, pmo: v }))} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <CompactField label="Cutover (d)"  value={wLocal.cutover}  setValue={(v) => setWLocal(s => ({ ...s, cutover: v }))} />
          <CompactField label="Training (d)" value={wLocal.training} setValue={(v) => setWLocal(s => ({ ...s, training: v }))} />
          <CompactField label="Hypercare (d)"value={wLocal.hyper}    setValue={(v) => setWLocal(s => ({ ...s, hyper: v }))} />
        </div>

        <div className="flex items-center gap-3">
          <button
            className="px-3 py-1.5 text-[14.5px] sm:text-sm border rounded-md bg-white hover:bg-slate-50"
            onClick={() => persist(undefined, { wrapper: { ...wLocal } })}
          >
            Save wrapper
          </button>
          <span className="text-[11.5px] sm:text-[11px] text-slate-500">
            Security, Tenant Ops, Migration cycles, PMO, Cutover, Training, Hypercare.
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: filters + list */}
        <div className="lg:col-span-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {LOB_ORDER.map((lob) => (
              <button
                key={lob}
                className={`px-3 py-1.5 rounded-full text-[14.5px] sm:text-sm border transition ${
                  activeLob === lob ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
                onClick={() => setActiveLob(lob)}
                title={lob}
              >
                {LOB_ICONS[lob]} {lob}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Search ${activeLob}…`}
                className="w-56 rounded-md border px-2 py-1.5 text-[14.5px] sm:text-sm"
              />
              <button className="text-[14.5px] sm:text-sm px-2 py-1 rounded-md border hover:bg-slate-50" onClick={selectAllFiltered}>
                Select all in tab
              </button>
              <button className="text-[14.5px] sm:text-sm px-2 py-1 rounded-md border hover:bg-slate-50" onClick={clearFiltered}>
                Clear tab
              </button>
            </div>
          </div>

          <div className="rounded-xl border bg-white max-h-[460px] overflow-auto">
            <div className="sticky top-0 z-10 bg-white/95 border-b px-3 py-2 text-[12.5px] sm:text-[12px] text-slate-500">
              {list.length} items • {selectedInView.length} selected here
            </div>
            {list.map((c) => (
              <label key={c.key} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={keysSet.has(c.key)}
                    onChange={() => toggleCap(c.key)}
                    className="h-4 w-4 text-blue-600 border-slate-300 rounded"
                  />
                  <span className="text-[14.5px] sm:text-sm">{c.label}</span>
                </div>
                <span className="text-[11.5px] sm:text-[11px] font-medium text-slate-600">{c.days ?? 0}d</span>
              </label>
            ))}
          </div>
        </div>

        {/* Right: drawer */}
        <div className="lg:col-span-4">
          <div className="bg-slate-50 border rounded-xl p-3 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[14.5px] sm:text-sm font-semibold text-slate-800">Selected in {activeLob}</h3>
              <span className="text-[12.5px] sm:text-xs text-slate-500">{selectedInView.length}</span>
            </div>
            <div className="flex-1 overflow-auto space-y-1 pr-1">
              {selectedInView.length === 0 ? (
                <div className="text-[12.5px] sm:text-xs text-slate-500">None selected.</div>
              ) : (
                selectedInView.map((c) => (
                  <div key={c.key} className="flex items-center justify-between bg-white border rounded-md px-2 py-1.5 text-[12.5px] sm:text-xs">
                    <span className="truncate">{c.label}</span>
                    <button className="text-[11px] text-red-600 hover:underline" onClick={() => toggleCap(c.key)}>
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col sm:flex-row items-center justify-end gap-2">
        <button
          className="px-4 py-2 text-[14.5px] sm:text-sm border rounded-md"
          onClick={() => persist(undefined)}
        >
          Save preset for {activePreset[0].toUpperCase() + activePreset.slice(1)}
        </button>
        <button
          className="px-4 py-2 text-[14.5px] sm:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          onClick={onApply}
          title={`Apply ${tier.toUpperCase()} now (using overrides if enabled)`}
        >
          Apply overrides now
        </button>
      </div>
    </Card>
  );
}

/* =============== Pro Mode (mobile-first) =============== */
function ProMode(props) {
  const {
    // state
    activeLob, setActiveLob,
    capSearch, setCapSearch,
    selectedCaps, setSelectedCaps,
    includeDRC, setIncludeDRC,
    myMultipliers, setMyMultipliers,
    adminOverride, setAdminOverride,
    capDays, setCapDays,
    industryTemplate, applyIndustryTemplate,
    tier, applyTier,
    // wrapper
    securityDays, setSecurityDays,
    tenantOpsDays, setTenantOpsDays,
    migrationCycles, setMigrationCycles,
    pmoDays, setPmoDays,
    cutoverDays, setCutoverDays,
    trainingDays, setTrainingDays,
    hypercareDays, setHypercareDays,
    // FRICEW
    selectedForms, setSelectedForms,
    selectedIfs, setSelectedIfs,
    // commercial
    sgRate, setSgRate,
    fx, setFx,
    myRate, setMyRate,
    amsRate, setAmsRate,
    rounding, setRounding,
    allowMandayDiscount, setAllowMandayDiscount,
    mandayDiscountPct, setMandayDiscountPct,
    rateDiscountPct, setRateDiscountPct,
    // risk
    clientType, setClientType,
    migrationType, setMigrationType,
    timelineType, setTimelineType,
    complexityLevel, setComplexityLevel,
    // AMS
    selectedAMS, setSelectedAMS,
    amsDiscountPct, setAmsDiscountPct,
    includeAMSInTotal, setIncludeAMSInTotal,
    // timeline controls
    teamSize, setTeamSize,
    workingDaysPerWeek, setWorkingDaysPerWeek,
    // numbers
    sgFunctionalDays,
    sgFunctionalPriceMYR,
    myFunctionalDays,
    formsDays, ifDays,
    technicalDays, wrapperDays,
    riskMultiplier,
    myTotalMandays,
    myProjectRate,
    myProjectPrice,
    timelineWeeks, timelineMonths,
    warnings,
    amS,
    exportData, pdfSummary,
    applyTierWithOverrides,
  } = props;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-6">
        {/* Industry & Tier */}
        <Card title="Industry & Tier" subtitle="Everything adapts from these anchors.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Industry */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(INDUSTRY_TEMPLATES).map(([key, template]) => (
                  <button
                    key={key}
                    className={`px-3 py-2 rounded-lg border text-left transition ${industryTemplate === key ? "border-blue-600 bg-blue-50" : "border-slate-300 hover:bg-slate-50"}`}
                    onClick={() => applyIndustryTemplate(key)}
                  >
                    <div className="text-[14.5px] sm:text-sm font-medium">{template.name}</div>
                    <div className="text-[12.5px] sm:text-xs text-slate-500">{template.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tier */}
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
              {["essential","standard","premium"].map(t => (
              <button
                key={t}
                className={`px-3 py-2 rounded-lg border transition ${tier === t ? "border-blue-600 bg-blue-50" : "border-slate-300 hover:bg-slate-50"}`}
                onClick={() => applyTierWithOverrides(t)}
              >
                <span className="text-[14.5px] sm:text-sm">{t[0].toUpperCase()+t.slice(1)}</span>
              </button>
              ))}
            </div>
              <div className="text-[12.5px] sm:text-xs text-slate-500">
                DRC: <strong>{tier==="essential" ? "Optional" : "Included"}</strong>
              </div>
            </div>
          </div>
        </Card>

        {/* Risk */}
        <Card title="Risk & Project Parameters" subtitle="Effort scales by risk context.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <SelectField label="Client Type" value={clientType} setValue={setClientType} options={Object.keys(RISK_FACTORS.clientType)} />
            <SelectField label="Migration Type" value={migrationType} setValue={setMigrationType} options={Object.keys(RISK_FACTORS.migration)} />
            <SelectField label="Timeline Pressure" value={timelineType} setValue={setTimelineType} options={Object.keys(RISK_FACTORS.timeline)} />
            <SelectField label="Complexity" value={complexityLevel} setValue={setComplexityLevel} options={Object.keys(RISK_FACTORS.complexity)} />
          </div>
          <div className="mt-3 p-3 bg-slate-50 rounded-lg text-[14.5px] sm:text-sm text-slate-600">
            Risk Multiplier: <span className="font-medium">{riskMultiplier.toFixed(2)}x</span>
            {riskMultiplier > 1.2 && <span className="text-amber-600 ml-2">⚠️ High Risk</span>}
          </div>
        </Card>

        {/* Functional */}
        <FunctionalCapabilitiesCard
          activeLob={activeLob} setActiveLob={setActiveLob}
          capSearch={capSearch} setCapSearch={setCapSearch}
          selectedCaps={selectedCaps} setSelectedCaps={setSelectedCaps}
          includeDRC={includeDRC} setIncludeDRC={setIncludeDRC}
          myMultipliers={myMultipliers} setMyMultipliers={setMyMultipliers}
          adminOverride={adminOverride} setAdminOverride={setAdminOverride}
          capDays={capDays} setCapDays={setCapDays}
          tier={tier}
        />

        {/* Delivery Tempo */}
        <Card title="Delivery Tempo" subtitle="We’ll compute an achievable timeline and utilization.">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Team Size (FTE)" value={teamSize} setValue={setTeamSize} />
            <Field label="Working Days/Week" value={workingDaysPerWeek} setValue={setWorkingDaysPerWeek} />
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
              <div className="text-sm text-slate-600">Estimated Timeline</div>
              <div className="text-lg font-semibold">{timelineWeeks} weeks</div>
              <div className="text-xs text-slate-600">{timelineMonths} months</div>
            </div>
          </div>
        </Card>

        {/* Technical & Wrapper */}
        <Card title="Technical & Delivery Wrapper">
          <div className="grid md:grid-cols-4 gap-4">
            <Field label="Security & Authorization (d)" value={securityDays} setValue={setSecurityDays} />
            <Field label="Tenant Ops (d)" value={tenantOpsDays} setValue={setTenantOpsDays} />
            <Field label="Migration Cycles" value={migrationCycles} setValue={setMigrationCycles} />
            <div className="text-[12.5px] sm:text-xs text-slate-500 flex items-end">x{TECH.migrationPerCycle}d per cycle</div>
          </div>
          <div className="grid md:grid-cols-4 gap-4 mt-4">
            <Field label="PMO & QA (d)" value={pmoDays} setValue={setPmoDays} />
            <Field label="Cutover (d)" value={cutoverDays} setValue={setCutoverDays} />
            <Field label="Training (d)" value={trainingDays} setValue={setTrainingDays} />
            <Field label="Hypercare (d)" value={hypercareDays} setValue={setHypercareDays} />
          </div>
        </Card>

        {/* FRICEW */}
        <Card title="Forms & Interfaces (FRICEW)" subtitle="Keep the essentials. Add only what matters.">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-[14.5px] sm:text-sm font-medium mb-2">Forms</div>
              <div className="space-y-2">
                {FORMS.map(f => {
                  const checked = selectedForms.has(f.key);
                  return (
                    <label key={f.key} className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked}
                          onChange={(e) => {
                            const ns = new Set(selectedForms);
                            e.target.checked ? ns.add(f.key) : ns.delete(f.key);
                            setSelectedForms(ns);
                          }}
                        />
                        <span className="text-[14.5px] sm:text-sm">{f.label}</span>
                      </div>
                      <span className="text-[12.5px] sm:text-xs text-slate-500">{f.days}d</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-[14.5px] sm:text-sm font-medium mb-2">Interfaces</div>
              <div className="space-y-2">
                {INTERFACES.map(i => {
                  const checked = selectedIfs.has(i.key);
                  return (
                    <label key={i.key} className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked}
                          onChange={(e) => {
                            const ns = new Set(selectedIfs);
                            e.target.checked ? ns.add(i.key) : ns.delete(i.key);
                            setSelectedIfs(ns);
                          }}
                        />
                        <span className="text-[14.5px] sm:text-sm">{i.label}</span>
                      </div>
                      <span className="text-[12.5px] sm:text-xs text-slate-500">{i.days}d</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Commercial */}
        <Card title="Commercial & Rates" subtitle="Base rates, discounts, rounding.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>
        </Card>

        {/* AMS */}
        <Card title="AMS Bundle (3-year)" subtitle="Offer 30–50 days/year with discount">
          <div className="grid md:grid-cols-3 gap-4 items-start">
            <div className="space-y-2 md:col-span-2">
              {AMS_CHOICES.map((a) => (
                <label key={a.key} className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <input type="radio" name="ams" className="h-4 w-4" checked={selectedAMS === a.key} onChange={() => setSelectedAMS(a.key)} />
                    <span className="text-[14.5px] sm:text-sm text-slate-800">{a.label}</span>
                  </div>
                  <span className="text-[12.5px] sm:text-xs text-slate-500">{a.daysPerYear}d/yr</span>
                </label>
              ))}
              <label className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <input type="radio" name="ams" className="h-4 w-4" checked={!selectedAMS} onChange={() => setSelectedAMS(null)} />
                  <span className="text-[14.5px] sm:text-sm text-slate-800">No AMS bundle</span>
                </div>
              </label>
            </div>

            <div className="space-y-3">
              <Range label="AMS Discount" value={amsDiscountPct} setValue={setAmsDiscountPct} min={0} max={25} />
              <label className="flex items-center justify-between rounded-md border border-slate-200 p-2">
                <span className="text-[14.5px] sm:text-sm text-slate-700">Include AMS in total</span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={includeAMSInTotal}
                  onChange={(e) => setIncludeAMSInTotal(e.target.checked)}
                />
              </label>
              <div className="text-[14.5px] sm:text-sm text-slate-700">
                AMS Price: <span className="font-semibold">RM <Num value={amS.price} /></span>
                <span className="text-[12.5px] sm:text-xs text-slate-500"> ({amS.days} d)</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Warnings */}
        {warnings.length > 0 && (
          <Card title="Project Considerations">
            <ul className="list-disc pl-6 text-[14.5px] sm:text-sm text-amber-700 space-y-1">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </Card>
        )}
      </div>

      {/* Right Summary (Pro) */}
      <aside className="lg:col-span-4">
        <div className="sticky top-20 space-y-3">
          <Card title="Numbers" subtitle="Live totals">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[14.5px] sm:text-sm text-slate-700">Functional (MY)</span>
                <span className="text-[14.5px] sm:text-sm font-medium"><Num value={myFunctionalDays} /> d</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[14.5px] sm:text-sm text-slate-700">FRICEW</span>
                <span className="text-[14.5px] sm:text-sm font-medium"><Num value={formsDays + ifDays} /> d</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[14.5px] sm:text-sm text-slate-700">Technical</span>
                <span className="text-[14.5px] sm:text-sm font-medium"><Num value={technicalDays} /> d</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[14.5px] sm:text-sm text-slate-700">Wrapper</span>
                <span className="text-[14.5px] sm:text-sm font-medium"><Num value={wrapperDays} /> d</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-[14.5px] sm:text-sm text-slate-700">Total Mandays</span>
                <span className="text-base font-semibold"><Num value={myTotalMandays} /> d</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[14.5px] sm:text-sm text-slate-700">Project Price</span>
                <span className="text-[20px] sm:text-lg font-bold text-slate-900">RM <Num value={myProjectPrice} /></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[14.5px] sm:text-sm text-slate-700">AMS (3y)</span>
                <span className="text-[14.5px] sm:text-sm font-medium">RM <Num value={amS.price} /> <span className="text-[12.5px] sm:text-xs text-slate-500">({amS.days} d)</span></span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-[14.5px] sm:text-sm text-slate-700">Grand Total</span>
                <span className="text-[20px] sm:text-lg font-extrabold text-slate-900">
                  RM <Num value={myProjectPrice + (includeAMSInTotal ? amS.price : 0)} />
                </span>
              </div>
              <div className="text-[12.5px] sm:text-xs text-slate-500">
                SG ref: <Num value={sgFunctionalDays} /> d • RM <Num value={sgFunctionalPriceMYR} />
              </div>
              <div className="text-[12.5px] sm:text-xs text-slate-500">Timeline: {timelineWeeks} wks ({timelineMonths} mo)</div>
            </div>
            <div className="mt-4">
              <ExportButtons
                data={exportData}
                filename={`abeam-pro-${new Date().toISOString().split('T')[0]}`}
                summary={pdfSummary}
              />
            </div>
          </Card>
        </div>
      </aside>
    </main>
  );
}

function FunctionalCapabilitiesCard({
  activeLob, setActiveLob,
  capSearch, setCapSearch,
  selectedCaps, setSelectedCaps,
  includeDRC, setIncludeDRC,
  myMultipliers, setMyMultipliers,
  adminOverride, setAdminOverride,
  capDays, setCapDays,
  tier,
}) {
  const tabCounts = countCheckedByFunction(selectedCaps);

  const filteredCaps = SG_CAPS.filter(c =>
    (c.function || "Finance") === activeLob &&
    capMatches(c, capSearch)
  );

  const toggleCap = (key) => {
    setSelectedCaps(prev => {
      const ns = new Set(prev);
      ns.has(key) ? ns.delete(key) : ns.add(key);
      return ns;
    });
  };

  const selectAllFiltered = () => {
    const keys = filteredCaps.map(c => c.key);
    setSelectedCaps(prev => {
      const ns = new Set(prev);
      keys.forEach(k => ns.add(k));
      return ns;
    });
  };

  const clearAllFiltered = () => {
    const keys = new Set(filteredCaps.map(c => c.key));
    setSelectedCaps(prev => new Set([...prev].filter(k => !keys.has(k))));
  };

  const pinFinanceCore = () => {
    const core = ["gl_general_ledger","aa_asset_acct","pay_processing","open_item_mgt"];
    setSelectedCaps(prev => {
      const ns = new Set(prev);
      core.forEach(k => ns.add(k));
      return ns;
    });
  };

  const selectedInView = filteredCaps.filter(c => selectedCaps.has(c.key));

  const QuickSetChip = ({label, onClick}) => (
    <button
      type="button"
      onClick={onClick}
      className="text-[12.5px] sm:text-xs px-2 py-1 rounded-full border border-slate-300 hover:bg-slate-50"
    >
      {label}
    </button>
  );

  return (
    <Card
      title="Functional Capabilities"
      subtitle="Lightweight picker with clear alignment. 0-day rows are covered by bundles."
      footer={
        <div className="text-[11.5px] sm:text-[11px] text-slate-500">
          DRC: <strong>{tier==="essential" ? "Optional" : "Included"}</strong>. “Select all / Clear” applies to current filters only.
        </div>
      }
    >
      {/* Toolbar */}
      <div className="relative z-0 flex flex-wrap gap-3 items-stretch mb-4">
        {/* Tabs */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 pr-1 shrink-0">
          {LOB_ORDER.map((lob) => (
            <button
              key={lob}
              className={`px-3 py-1.5 rounded-full text-[14.5px] sm:text-sm border whitespace-nowrap transition ${activeLob === lob ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}
              onClick={() => setActiveLob(lob)}
              title={lob}
            >
              {LOB_ICONS[lob]} {lob} ({tabCounts[lob] || 0})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[280px]">
          <div className="flex gap-2">
            <input
              type="text"
              value={capSearch}
              onChange={(e) => setCapSearch(e.target.value)}
              placeholder={`Search ${activeLob}…`}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-[14.5px] sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
            {capSearch && (
              <button
                className="text-[14.5px] sm:text-sm px-2 rounded-md border border-slate-300 hover:bg-slate-50"
                onClick={() => setCapSearch("")}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-4 shrink-0">
          <label className="inline-flex items-center gap-2 text-[14.5px] sm:text-sm text-slate-700 whitespace-nowrap">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={includeDRC}
              onChange={(e) => setIncludeDRC(e.target.checked)}
            />
            <span>DRC (e-Invoice)</span>
            <span className={`text-[11.5px] sm:text-[11px] px-1.5 py-0.5 rounded-full ${tier==="essential" ? "bg-slate-200 text-slate-700" : "bg-green-600 text-white"}`}>
              {tier==="essential" ? "Optional" : "Included"}
            </span>
          </label>

          <label className="inline-flex items-center gap-2 text-[14.5px] sm:text-sm text-slate-700 whitespace-nowrap">
            <Toggle checked={adminOverride} onChange={setAdminOverride} />
            <span>Admin Override</span>
          </label>
        </div>
      </div>

      {/* Quick sets + counts */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap gap-2">
          <QuickSetChip label="Pin Finance Core" onClick={pinFinanceCore} />
          <QuickSetChip label="Select all (filtered)" onClick={selectAllFiltered} />
          <QuickSetChip label="Clear (filtered)" onClick={clearAllFiltered} />
          <QuickSetChip label="Reset MY multipliers" onClick={() => setMyMultipliers(DEFAULT_MY_MULTIPLIERS)} />
        </div>
        <div className="text-[12.5px] sm:text-xs text-slate-600">
          In view: <strong>{filteredCaps.length}</strong> • Selected here: <strong>{selectedInView.length}</strong>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* List */}
        <div className="lg:col-span-8">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="max-h-[520px] overflow-auto divide-y divide-slate-100">
              {filteredCaps.map((c) => {
                const checked = selectedCaps.has(c.key);
                const isBundleRow = !!c.bundle;
                const isDRCRow = c.key === "drc_tax";
                const days = capDays[c.key] ?? c.days ?? 0;

                return (
                  <details key={c.key} className={`group ${checked ? "bg-blue-50/50" : ""}`}>
                    {/* Row */}
                    <summary className="list-none cursor-pointer px-3 py-2.5">
                      <div className={`grid grid-cols-[20px,1fr,auto] items-center gap-3 rounded-lg ${checked ? "border border-blue-400 bg-white/80" : ""} px-2 py-1.5`}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={checked}
                          onChange={(e) => { e.preventDefault(); toggleCap(c.key); }}
                          onClick={(e)=>e.stopPropagation()}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[14.5px] sm:text-sm text-slate-900 font-medium break-words">{c.label}</span>
                            {isBundleRow && <Badge>Bundle</Badge>}
                            {isDRCRow && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tier==="essential" ? "bg-slate-200 text-slate-700" : "bg-green-600 text-white"}`}>
                                {tier==="essential" ? "Optional" : "Included"}
                              </span>
                            )}
                          </div>
                          <div className="text-[11.5px] sm:text-[11px] text-slate-500 truncate">{c.product} • {c.package}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11.5px] sm:text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">
                            {Number(days)}d
                          </span>
                          <span className="text-slate-400 text-xs transition group-open:rotate-180">▾</span>
                        </div>
                      </div>
                    </summary>

                    {/* Expand */}
                    <div className="px-5 pb-3">
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-[64px,110px,1fr] gap-3">
                        {/* Base days (number only) */}
                        <div className="flex items-center justify-end rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
                          {adminOverride ? (
                            <input
                              type="number"
                              step="1"
                              value={capDays[c.key] ?? c.days ?? 0}
                              onChange={(e) =>
                                setCapDays((prev) => ({ ...prev, [c.key]: Math.max(0, +e.target.value || 0) }))
                              }
                              className="w-14 text-right rounded border border-slate-300 px-1 py-0.5 text-[12.5px] sm:text-xs focus:border-blue-500 focus:ring-blue-500"
                            />
                          ) : (
                            <span className="text-[12.5px] sm:text-xs text-slate-700">{capDays[c.key] ?? c.days ?? 0}d</span>
                          )}
                        </div>

                        {/* MY multiplier */}
                        <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1">
                          <span className="text-[11.5px] sm:text-[11px] text-slate-600 mr-2">MY</span>
                          <input
                            type="number"
                            step="0.05"
                            value={myMultipliers[c.key] ?? 1}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              setMyMultipliers({ ...myMultipliers, [c.key]: Number.isFinite(v) ? v : 1 });
                            }}
                            className="w-16 text-right rounded border border-slate-300 px-1 py-0.5 text-[12.5px] sm:text-xs focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        {/* Status hint */}
                        <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[12.5px] sm:text-xs text-slate-600">
                          {isBundleRow ? "Included bundle – atomic items in same scope auto-covered." : "Atomic item."}
                        </div>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Drawer */}
        <div className="lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sticky top-24">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[14.5px] sm:text-sm font-semibold text-slate-800">Selected in {activeLob}</h3>
              <button
                type="button"
                className="text-[12.5px] sm:text-xs text-blue-700 hover:underline"
                onClick={clearAllFiltered}
                title="Clear selected in current view"
              >
                Clear view
              </button>
            </div>
            <div className="max-h-[260px] overflow-auto space-y-1 pr-1">
              {selectedInView.length === 0 ? (
                <div className="text-[12.5px] sm:text-xs text-slate-500">Nothing selected in this tab.</div>
              ) : (
                selectedInView.map(c => (
                  <div key={c.key} className="flex items-center justify-between bg-white border border-slate-200 rounded-md px-2 py-1.5">
                    <span className="text-[12.5px] sm:text-xs text-slate-700 break-words mr-2">{c.label}</span>
                    <button
                      className="text-[11.5px] sm:text-[11px] text-slate-500 hover:text-red-600"
                      onClick={() => toggleCap(c.key)}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-[12.5px] sm:text-xs text-slate-600">
              <span>Total in view</span>
              <span className="font-medium">{selectedInView.length}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
