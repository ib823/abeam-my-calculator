import React, { useMemo, useState, useEffect } from "react";

/* ============================================================
   Catalogs (keys for UI, labels for client-facing docs)
   ============================================================ */
const SG_CAPS = [
  { key: "gl",  label: "General Ledger Accounting" },
  { key: "aa",  label: "Asset Accounting" },
  { key: "ap",  label: "Accounts Payable" },
  { key: "ar",  label: "Accounts Receivable" },
  { key: "cm",  label: "Cash Management" },
  { key: "tax", label: "SST (Malaysia) — Indirect Tax" },
];

const FORMS = [
  { key: "inv", label: "Tax Invoice" },
  { key: "dn",  label: "Debit Note" },
  { key: "cn",  label: "Credit Note" },
  { key: "ra",  label: "Remittance Advice" },
];

const INTERFACES = [
  { key: "bank_upload",    label: "Bank Interface (Manual Upload)" },
  { key: "bank_host2host", label: "Bank Interface (Host-to-Host)" },
  { key: "sso",            label: "SSO (Microsoft Entra ID)" },
];

/* ============================================================
   Helpers
   ============================================================ */
const clampNum = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v || 0)));
const int = (v) => (Number.isFinite(+v) ? Math.trunc(+v) : 0);
const rm0 = (n) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

/** Open a new tab and deliver a payload via postMessage + token hand-off */
function openWithPayload(url, payload) {
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  try { localStorage.setItem(`ikm:payload:${token}`, JSON.stringify(payload)); } catch {}

  const w = window.open(`${url}#lk=${encodeURIComponent(token)}`, "_blank", "noopener,noreferrer");
  if (!w) { alert("Popup blocked. Please allow popups for this site."); return; }

  // Best-effort postMessage retries (faster than waiting for the token fallback)
  const msg = { type: "proposalData", payload };
  let tries = 0;
  const t = setInterval(() => {
    tries += 1;
    try { w.postMessage(msg, "*"); } catch {}
    if (tries >= 10) clearInterval(t);
  }, 150);
}

/* ============================================================
   Export Buttons (PDF / Cockpit / Proposal / JSON)
   ============================================================ */
function ExportButtons({
  summary,
  filename = "ABeam_Proposal",
  state,
  selectedCaps,
  selectedForms,
  selectedIfs,
}) {
  // ---------- JSON (debug/export) ----------
  const exportToJSON = () => {
    const payload = buildUnifiedPayload({ summary, state, selectedCaps, selectedForms, selectedIfs });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `${filename}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ---------- PDF (HTML string -> print) ----------
  const exportToPDF = () => {
    const s = summary;
    const logoUrl = `${window.location.origin}/abeam-logo.png`;
    const generatedAt = new Date().toLocaleString();

    const headerSection = `
      <div class="brand">
        <img src="${logoUrl}" alt="ABeam" height="56"/>
        <div>
          <h1>SAP Cloud ERP Implementation Proposal</h1>
          <p>ABeam Malaysia</p>
        </div>
      </div>`;

    const heroSection = `
      <div class="hero">
        <div class="big">${rm0(s.grandTotal)}</div>
        <div class="sub">${s.finalDays} mandays • ${s.timelineWeeks} weeks • ${s.teamSize} ABeam Members</div>
      </div>`;

    const effortTable = `
      <table>
        <thead><tr><th>Item</th><th>Days</th></tr></thead>
        <tbody>
          <tr><td>Functional</td><td>${s.functionalDays}</td></tr>
          <tr><td>FRICEW</td><td>${s.fricewDays}</td></tr>
          <tr><td>Technical</td><td>${s.technicalDays}</td></tr>
          <tr><td>Wrapper</td><td>${s.wrapperDays}</td></tr>
          <tr class="total"><td><strong>Total</strong></td><td><strong>${s.finalDays}</strong></td></tr>
        </tbody>
      </table>`;

    const financialTable = `
      <table>
        <thead><tr><th>Item</th><th>Days</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>
          <tr><td>Implementation</td><td>${s.finalDays}</td><td>${rm0(s.finalRate)}</td><td>${rm0(s.implementationSubtotal)}</td></tr>
          ${s.amsMonths > 0 ? `<tr><td>AMS (${s.amsMonths} months)</td><td>-</td><td>-</td><td>${rm0(s.amsFinalPrice)}</td></tr>` : ""}
        </tbody>
        <tfoot><tr><td colspan="3"><strong>Grand Total</strong></td><td><strong>${rm0(s.grandTotal)}</strong></td></tr></tfoot>
      </table>`;

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>ABeam Malaysia Proposal</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .brand { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; }
    .brand h1 { margin: 0; font-size: 24px; }
    .brand p { margin: 5px 0 0; color: #666; }
    .hero { background: #0B2F86; color: white; padding: 30px; text-align: center; border-radius: 10px; margin: 20px 0; }
    .hero .big { font-size: 36px; font-weight: bold; margin-bottom: 10px; }
    .hero .sub { font-size: 14px; opacity: 0.9; }
    h2 { color: #0B2F86; border-bottom: 2px solid #eee; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: bold; }
    .total { background: #f9f9f9; }
    tfoot td { font-weight: bold; background: #0B2F86; color: white; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  ${headerSection}
  ${heroSection}

  <h2>Effort Breakdown</h2>
  ${effortTable}

  <h2>Financial Summary</h2>
  ${financialTable}

  <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
    Generated: ${generatedAt} • Package: ${s.tier.toUpperCase()}
  </div>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => { try { w.print(); } catch {} }, 450);
    }
  };

  // ---------- Proposal Renderer / Cockpit ----------
  const openCockpit = () => {
    const payload = buildUnifiedPayload({ summary, state, selectedCaps, selectedForms, selectedIfs });
    openWithPayload("/internal-cockpit.html", payload);
  };

  const openProposal = () => {
    const payload = buildUnifiedPayload({ summary, state, selectedCaps, selectedForms, selectedIfs });
    openWithPayload("/proposal-renderer.html", payload);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
      <button type="button" onClick={exportToPDF}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition text-center text-sm">
        PDF
      </button>
      <button type="button" onClick={openCockpit}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition text-center text-sm">
        Cockpit
      </button>
      <button type="button" onClick={openProposal}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition text-center text-sm">
        Proposal
      </button>
      <button type="button" onClick={exportToJSON}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition text-center text-sm">
        JSON
      </button>
    </div>
  );
}

/* ============================================================
   Build Unified Payload (shared by Proposal Renderer & Cockpit)
   ============================================================ */
function buildUnifiedPayload({ summary, state, selectedCaps, selectedForms, selectedIfs }) {
  // Scope labels (client-facing)
  const capLabels  = SG_CAPS.filter(x => selectedCaps.has(x.key)).map(x => x.label);
  const formLabels = FORMS.filter(x => selectedForms.has(x.key)).map(x => x.label);
  const ifLabels   = INTERFACES.filter(x => selectedIfs.has(x.key)).map(x => x.label);

  // Canonical financials (exact numbers your PDF shows)
  const financials = {
    baseDays:               summary.baseDays,
    baseRate:               summary.baseRate,
    baseAmount:             summary.baseAmount,
    mandayPct:              summary.mandayPct,
    ratePct:                summary.ratePct,
    mandayDaysDelta:        summary.mandayDaysDelta,
    mdAmt:                  summary.mandayDiscountAmount,
    rtAmt:                  summary.rateDiscountAmount,
    finalDays:              summary.finalDays,
    finalRate:              summary.finalRate,
    implementationSubtotal: summary.implementationSubtotal,
    amsBaseDays:            summary.amsBaseDays || 0,
    amsRate:                0,
    amsBasePrice:           summary.amsBasePrice || 0,
    amsDays:                summary.amsFinalDays || summary.amsBaseDays || 0,
    amsPrice:               summary.amsFinalPrice || summary.amsBasePrice || 0,
    rounding:               summary.rounding,
    grandTotal:             summary.grandTotal,
  };

  // Derived strings/rows for renderer
  const clientName   = state?.clientName ?? "Client";
  const packageTier  = (state?.packageTier || summary.tier || "standard").toLowerCase();
  const totalMandays = Number(summary.finalDays || 0);
  const teamSize     = Number(summary.teamSize || state?.teamSize || 5);
  const workdays     = Number(summary.workingDaysPerWeek || state?.workdays || 5);
  const weeks        = Number(summary.timelineWeeks || 12);

  // Simple phases scaled by weeks (keeps renderer timeline readable)
  const phaseDefs = [
    ["Project Prep", 0.10],
    ["Explore/Design", 0.25],
    ["Build/Configure", 0.30],
    ["Test", 0.18],
    ["Cutover", 0.10],
    ["Go-Live & Hypercare", 0.07],
  ];

  
  const startDate = new Date(); // today as a simple baseline
  const phases = [];
  let cur = new Date(startDate);
  phaseDefs.forEach(([name, frac]) => {
    const durW = Math.max(1, Math.round(weeks * frac));
    const s = new Date(cur);
    const e = new Date(cur); e.setDate(e.getDate() + durW * 7 - 1);
    phases.push({ name, start: toISOYMD(s), end: toISOYMD(e) });
    cur = new Date(e); cur.setDate(cur.getDate() + 1);
  });

  // Commercial rows the renderer expects
  const commercials = [
    { label: "Implementation", base: financials.baseAmount, percent: 0, amount: 0, net: financials.implementationSubtotal, notes: "" },
  ];
  if (financials.amsPrice > 0) {
    commercials.push({ label: `AMS (${state?.amsMonths ?? 0} months)`, base: financials.amsBasePrice, percent: 0, amount: 0, net: financials.amsPrice, notes: "" });
  }

  // Milestones (simple 30/40/30 split as a placeholder)
  const ms1 = Math.round(financials.implementationSubtotal * 0.30);
  const ms2 = Math.round(financials.implementationSubtotal * 0.40);
  const ms3 = financials.implementationSubtotal - ms1 - ms2;
  const milestones = [
    { name: "Project Start", when: "Kick-off", amount: rm0(ms1), notes: "" },
    { name: "UAT Start",     when: "UAT Begins", amount: rm0(ms2), notes: "" },
    { name: "Go-Live",       when: "Go-Live", amount: rm0(ms3), notes: "" },
  ];

  // Scope columns (3 cards)
  const scopeColumns = [
    { title: "Selected Capabilities", items: capLabels },
    { title: "Forms",                 items: formLabels },
    { title: "Interfaces",            items: ifLabels },
  ];

  const timelineSummary = `${weeks} weeks • ${teamSize} FTE • ${workdays} days/week`;

  // Bundle for everyone (renderer + cockpit)
  const payload = {
    // Header / KPIs the renderer reads
    clientName,
    clientShort: state?.clientShort || clientName,
    packageTier,
    proposalId: `ABMY-${Date.now().toString(36).toUpperCase()}`,
    validityDays: 30,
    generatedAt: new Date().toLocaleString(),

    // KPI numbers
    grandTotal: financials.grandTotal,
    totalMandays,
    timelineSummary,

    // Timeline
    phases,
    blackouts: [],

    // Commercials / Milestones
    commercials,
    priceNote: "Client pricing is based on mandays × rate. Taxes excluded.",
    milestones,

    // Scope
    scopeColumns,

    // Inputs audit (short)
    inputAudit: [
      { key: "Rate (RM/day)", value: rm0(summary.projectRate) },
      { key: "Manday Discount %", value: String(summary.mandayPct || 0) },
      { key: "Rate Discount %", value: String(summary.ratePct || 0) },
      { key: "Rounding (RM)", value: rm0(summary.rounding || 0) },
    ],
    generatorName: "ABeam Calculator",
    generatorEmail: "no-reply@abeam.com",
    inputsHash: Math.random().toString(36).slice(2).toUpperCase(),

    // Explicit bucket for internal cockpit (and any other consumer)
    financials,

    // Also hand over a snapshot of the summary used by your PDF
    pdfSummarySnapshot: summary,
  };

  // Stash a handy copy for anything else (optional)
  try {
    sessionStorage.setItem("abeam_pdf_summary", JSON.stringify({ summary, proposal: payload }));
  } catch {}

  return payload;
}

function toISOYMD(d) {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ============================================================
   UI Components
   ============================================================ */
function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm text-slate-700">{label}</div>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  );
}

function Num({ value, onChange }) {
  return (
    <input
      type="number"
      className="w-32 border rounded px-2 py-1 text-right"
      value={value}
      onChange={(e) => onChange(int(e.target.value))}
    />
  );
}

function Picker({ title, options, set, onToggle }) {
  return (
    <div className="border rounded-lg p-3">
      <div className="text-sm font-semibold mb-2">{title}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = set.has(o.key);
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onToggle(o.key)}
              className={
                "px-3 py-1 rounded-full border text-sm " +
                (active
                  ? "border-blue-600 text-blue-700 bg-blue-50"
                  : "border-slate-300 hover:bg-slate-50")
              }
              title={o.label}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, strong }) {
  return (
    <div className="border rounded-lg p-2">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={"text-sm " + (strong ? "font-extrabold" : "font-semibold")}>{value}</div>
    </div>
  );
}

/* ============================================================
   Main Calculator App
   ============================================================ */
export default function App() {
  // --------- Client / project ---------
  const [clientName, setClientName] = useState("Client");
  const [clientShort, setClientShort] = useState("Client");
  const [tier, setTier] = useState("standard");
  const [teamSize, setTeamSize] = useState(5);
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState(5);
  const [estimatedWeeks, setEstimatedWeeks] = useState(12);

  // --------- Commercials ---------
  const [projectRate, setProjectRate] = useState(2000);
  const [mandayDiscountPct, setMandayDiscountPct] = useState(0);
  const [rateDiscountPct, setRateDiscountPct] = useState(0);
  const [rounding, setRounding] = useState(0);
  const [amsMonths, setAmsMonths] = useState(0);
  const [amsMonthlyRM, setAmsMonthlyRM] = useState(45000);

  // --------- Selections ---------
  const [selectedCaps, setSelectedCaps] = useState(new Set(["gl", "ap", "ar"]));
  const [selectedForms, setSelectedForms] = useState(new Set(["inv", "ra"]));
  const [selectedIfs, setSelectedIfs] = useState(new Set(["bank_upload"]));

  // --------- Effort (days) ---------
  const [functionalDays, setFunctionalDays] = useState(120);
  const [fricewDays, setFricewDays] = useState(40);
  const [technicalDays, setTechnicalDays] = useState(15);
  const [wrapperDays, setWrapperDays] = useState(65);

  // Quick presets by tier
  useEffect(() => {
    if (tier === "essential") {
      setFunctionalDays(80); setFricewDays(25); setTechnicalDays(10); setWrapperDays(45);
    } else if (tier === "standard") {
      setFunctionalDays(120); setFricewDays(40); setTechnicalDays(15); setWrapperDays(65);
    } else if (tier === "premium") {
      setFunctionalDays(160); setFricewDays(60); setTechnicalDays(20); setWrapperDays(90);
    }
  }, [tier]);

  // --------- Calculations ---------
  const summary = useMemo(() => {
    const baseDays   = int(functionalDays) + int(fricewDays) + int(technicalDays) + int(wrapperDays);
    const baseRate   = int(projectRate);
    const baseAmount = baseDays * baseRate;

    const mandayDaysDelta = Math.round((baseDays * (mandayDiscountPct || 0)) / 100);
    const daysAfterManday = baseDays - mandayDaysDelta;
    const rateAfter       = Math.round(baseRate * (1 - (rateDiscountPct || 0) / 100));

    const mdAmt = mandayDaysDelta * baseRate;
    const rtAmt = daysAfterManday * (baseRate - rateAfter);
    const implementationSubtotal = daysAfterManday * rateAfter;

    // AMS calculations
    const amsBaseDays   = amsMonths * 20; // illustrative
    const amsBasePrice  = amsMonths > 0 ? amsMonths * amsMonthlyRM : 0;
    const amsFinalPrice = amsBasePrice; // no AMS discounts for now

    const finalDays  = daysAfterManday;
    const finalRate  = rateAfter;
    const roundingRM = int(rounding);
    const grandTotal = implementationSubtotal + amsFinalPrice + roundingRM;

    const weeks = int(estimatedWeeks) || Math.max(1, Math.round(finalDays / Math.max(1, teamSize * workingDaysPerWeek)));

    return {
      // effort
      functionalDays, fricewDays, technicalDays, wrapperDays,
      baseDays, finalDays,

      // commercials
      baseRate, baseAmount,
      mandayPct: mandayDiscountPct, ratePct: rateDiscountPct,
      mandayDiscountAmount: mdAmt, rateDiscountAmount: rtAmt,
      implementationSubtotal, finalRate, rounding: roundingRM,

      // AMS
      amsMonths,
      amsBaseDays,
      amsBasePrice,
      amsFinalDays: amsBaseDays,
      amsFinalPrice,

      // totals
      grandTotal,

      // team / schedule
      teamSize, workingDaysPerWeek, timelineWeeks: weeks,

      // misc
      tier, projectRate, mandayDaysDelta,
    };
  }, [
    functionalDays, fricewDays, technicalDays, wrapperDays,
    projectRate, mandayDiscountPct, rateDiscountPct, rounding,
    amsMonths, amsMonthlyRM,
    teamSize, workingDaysPerWeek, estimatedWeeks, tier,
  ]);

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight">ABeam — SAP Cloud ERP Calculator</h1>
          <div className="text-sm text-slate-600">
            <span className="font-semibold">Client:</span>{" "}
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />{" "}
            <span className="ml-2 font-semibold">Short:</span>{" "}
            <input
              value={clientShort}
              onChange={(e) => setClientShort(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
          </div>
        </header>

        {/* Quick Mode */}
        <section className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border rounded-lg p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Package</div>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="essential">Essential</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            <div className="border rounded-lg p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Team Size</div>
              <input
                type="number"
                min={1}
                value={teamSize}
                onChange={(e) => setTeamSize(clampNum(e.target.value, 1, 50))}
                className="w-full border rounded px-2 py-1"
              />
            </div>

            <div className="border rounded-lg p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Working Days / Week</div>
              <input
                type="number"
                min={4}
                max={6}
                value={workingDaysPerWeek}
                onChange={(e) => setWorkingDaysPerWeek(clampNum(e.target.value, 4, 6))}
                className="w-full border rounded px-2 py-1"
              />
            </div>
          </div>
        </section>

        {/* Pro Mode */}
        <section className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border rounded-lg p-3">
              <div className="text-sm font-semibold mb-2">Effort (Mandays)</div>
              <div className="space-y-2">
                <Row label="Functional"><Num value={functionalDays} onChange={setFunctionalDays} /></Row>
                <Row label="FRICEW"><Num value={fricewDays} onChange={setFricewDays} /></Row>
                <Row label="Technical"><Num value={technicalDays} onChange={setTechnicalDays} /></Row>
                <Row label="Wrapper"><Num value={wrapperDays} onChange={setWrapperDays} /></Row>
                <Row label="Estimated Weeks"><Num value={estimatedWeeks} onChange={setEstimatedWeeks} /></Row>
              </div>
            </div>

            <div className="border rounded-lg p-3">
              <div className="text-sm font-semibold mb-2">Commercials</div>
              <div className="space-y-2">
                <Row label="Project Rate (RM/day)"><Num value={projectRate} onChange={setProjectRate} /></Row>
                <Row label="Manday Discount %"><Num value={mandayDiscountPct} onChange={setMandayDiscountPct} /></Row>
                <Row label="Rate Discount %"><Num value={rateDiscountPct} onChange={setRateDiscountPct} /></Row>
                <Row label="Rounding (RM)"><Num value={rounding} onChange={setRounding} /></Row>
                <Row label="AMS Months"><Num value={amsMonths} onChange={setAmsMonths} /></Row>
                <Row label="AMS Monthly (RM)"><Num value={amsMonthlyRM} onChange={setAmsMonthlyRM} /></Row>
              </div>
            </div>
          </div>
        </section>

        {/* Scope pickers */}
        <section className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Picker
              title="Capabilities"
              options={SG_CAPS}
              set={selectedCaps}
              onToggle={(k) => setSelectedCaps((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; })}
            />
            <Picker
              title="Forms"
              options={FORMS}
              set={selectedForms}
              onToggle={(k) => setSelectedForms((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; })}
            />
            <Picker
              title="Interfaces"
              options={INTERFACES}
              set={selectedIfs}
              onToggle={(k) => setSelectedIfs((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; })}
            />
          </div>
        </section>

        {/* Summary & Actions */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 border rounded-lg p-3">
            <div className="text-sm font-semibold mb-2">Summary</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <Stat label="Functional" value={`${functionalDays} d`} />
              <Stat label="FRICEW" value={`${fricewDays} d`} />
              <Stat label="Technical" value={`${technicalDays} d`} />
              <Stat label="Wrapper" value={`${wrapperDays} d`} />
              <Stat label="Total Days" value={`${summary.finalDays} d`} />
              <Stat label="Rate" value={rm0(summary.finalRate)} />
              <Stat label="Impl Subtotal" value={rm0(summary.implementationSubtotal)} />
              <Stat label="Grand Total" value={rm0(summary.grandTotal)} strong />
            </div>
          </div>

          <div className="border rounded-lg p-3">
            <div className="text-sm font-semibold mb-2">Export</div>
            <ExportButtons
              summary={summary}
              filename={`ABMY_${clientShort || "Client"}`}
              state={{
                clientName, clientShort, packageTier: tier,
                teamSize, workdays: workingDaysPerWeek, estimatedWeeks,
                myRate: projectRate, mandayDiscountPct, rateDiscountPct,
                roundingRM: rounding, amsMonths, amsMonthlyRM,
              }}
              selectedCaps={selectedCaps}
              selectedForms={selectedForms}
              selectedIfs={selectedIfs}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
