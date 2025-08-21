import React, { useMemo, useState, useEffect } from "react";

/* ---------- Data ---------- */
const SG_CAPS = [
  { key: "gl_aa_payments_open", label: "GL / AA / Payments / Open-Item", days: 193 },
  { key: "p2p_inv_acct", label: "Procurement & Inventory Accounting", days: 90 },
  { key: "local_close_analytics", label: "Local Close & Analytics", days: 39 },
  { key: "drc_tax", label: "DRC + Tax Setup", days: 26 },
  { key: "collections", label: "Collections Management", days: 26 },
  { key: "credit", label: "Credit Management", days: 26 },
  { key: "sales_service", label: "Sales & Service Accounting", days: 77 },
  { key: "overhead_prod_margin", label: "Overhead / Production / Margin", days: 103 },
  { key: "lease", label: "Lease Accounting", days: 64 },
  { key: "cash_mgmt", label: "Cash Management & Liquidity", days: 51 },
  { key: "trade_comp", label: "Trade Compliance", days: 64 },
];
const DEFAULT_MY_MULTIPLIERS = Object.fromEntries(SG_CAPS.map(c => [c.key, 1]));

const FORMS = [
  { key: "tax_invoice", label: "Tax Invoice", days: 4 },
  { key: "credit_note", label: "Credit Note", days: 3 },
  { key: "debit_note", label: "Debit Note", days: 3 },
  { key: "purchase_order", label: "Purchase Order", days: 4 },
  { key: "payment_advice", label: "Payment Advice", days: 2 },
  { key: "wht_cert", label: "Withholding Tax Certificate", days: 3 },
  { key: "delivery_note", label: "Delivery Note", days: 3 },
  { key: "grn", label: "Goods Receipt Note", days: 2 },
  { key: "remittance", label: "Remittance Advice", days: 2 },
  { key: "soa", label: "Statement of Account", days: 3 },
];
const INTERFACES = [
  { key: "if_payroll_fi", label: "HR/Payroll → FI Posting", days: 5 },
  { key: "if_open_items", label: "Legacy AR/AP Open-Items Upload", days: 5 },
  { key: "if_bank_export", label: "Bank Export File (payment)", days: 5 },
];

const TECH = { migrationPerCycle: 20 };
const AMS_CHOICES = [
  { key: "ams30", label: "AMS 30d/year (3y)", daysPerYear: 30 },
  { key: "ams40", label: "AMS 40d/year (3y)", daysPerYear: 40 },
];

/* ---------- Tiny helpers ---------- */
const Num = ({ value }) => <span className="font-mono">{Number(value).toLocaleString()}</span>;
const Toggle = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-11 h-6 rounded-full p-0.5 transition ${checked ? "bg-blue-600" : "bg-slate-300"}`}
  >
    <div className={`h-5 w-5 bg-white rounded-full shadow transition ${checked ? "translate-x-5" : ""}`} />
  </button>
);

/* ---------- UI building blocks ---------- */
function Card({ title, subtitle, children, footer }) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
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

function CheckboxRow({ checked, onChange, left, right }) {
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
      </div>
      {right && <span className="text-xs text-slate-500">{right}</span>}
    </label>
  );
}

/* =============================== App =============================== */
export default function App() {
  /* Modes & tiers */
  const [mode, setMode] = useState("guided");      // guided | free
  const [tier, setTier] = useState("essential");   // essential | standard | premium

  /* Functional */
  const [selectedCaps, setSelectedCaps] = useState(new Set(["gl_aa_payments_open", "p2p_inv_acct", "local_close_analytics"]));
  const [includeDRC, setIncludeDRC] = useState(false);
  const [myMultipliers, setMyMultipliers] = useState(DEFAULT_MY_MULTIPLIERS);

  /* FRICEW */
  const [selectedForms, setSelectedForms] = useState(new Set(["tax_invoice","credit_note","debit_note","purchase_order","payment_advice","wht_cert"]));
  const [selectedIfs, setSelectedIfs] = useState(new Set());

  /* Technical & wrapper */
  const [securityDays, setSecurityDays] = useState(20);
  const [tenantOpsDays, setTenantOpsDays] = useState(15);
  const [migrationCycles, setMigrationCycles] = useState(2);
  const [pmoDays, setPmoDays] = useState(55);
  const [cutoverDays, setCutoverDays] = useState(12);
  const [trainingDays, setTrainingDays] = useState(15);
  const [hypercareDays, setHypercareDays] = useState(15);

  /* Commercial */
  const [sgRate, setSgRate] = useState(700);
  const [fx, setFx] = useState(3.4);
  const [myRate, setMyRate] = useState(2000);
  const [amsRate, setAmsRate] = useState(1900);
  const [allowMandayDiscount, setAllowMandayDiscount] = useState(true);
  const [mandayDiscountPct, setMandayDiscountPct] = useState(0);
  const [rateDiscountPct, setRateDiscountPct] = useState(0);

  /* AMS */
  const [selectedAMS, setSelectedAMS] = useState(null);
  const [amsDiscountPct, setAmsDiscountPct] = useState(15);

  /* Guided presets */
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
  useEffect(()=>{ if (mode==="guided") applyTier(tier) }, [mode, tier]);

  /* Calculations */
  const sgSelected = useMemo(()=>SG_CAPS.filter(c=>selectedCaps.has(c.key)), [selectedCaps]);
  const sgFunctionalDays = useMemo(()=>{
    let base = sgSelected.reduce((a,c)=>a+c.days,0);
    if (includeDRC && !selectedCaps.has("drc_tax")) base += SG_CAPS.find(c=>c.key==="drc_tax").days;
    return base;
  },[sgSelected, includeDRC, selectedCaps]);
  const sgFunctionalPriceMYR = useMemo(()=> sgFunctionalDays * sgRate * fx, [sgFunctionalDays, sgRate, fx]);

  const myFunctionalDays = useMemo(()=>{
    let total=0;
    sgSelected.forEach(c => total += c.days * (myMultipliers[c.key] ?? 1));
    if (includeDRC && !selectedCaps.has("drc_tax")) total += SG_CAPS.find(c=>c.key==="drc_tax").days * (myMultipliers["drc_tax"] ?? 1);
    return Math.round(total);
  },[sgSelected, includeDRC, selectedCaps, myMultipliers]);

  const formsDays = useMemo(()=> FORMS.filter(f=>selectedForms.has(f.key)).reduce((a,b)=>a+b.days,0),[selectedForms]);
  const ifDays = useMemo(()=> INTERFACES.filter(i=>selectedIfs.has(i.key)).reduce((a,b)=>a+b.days,0),[selectedIfs]);
  const technicalDays = securityDays + tenantOpsDays + migrationCycles * TECH.migrationPerCycle;
  const wrapperDays = pmoDays + cutoverDays + trainingDays + hypercareDays;

  const myTotalMandaysRaw = myFunctionalDays + formsDays + ifDays + technicalDays + wrapperDays;
  const myMandayDiscountFactor = 1 - (allowMandayDiscount ? mandayDiscountPct/100 : 0);
  const myRateDiscountFactor = 1 - (rateDiscountPct/100);
  const myTotalMandays = Math.round(myTotalMandaysRaw * myMandayDiscountFactor);
  const myProjectRate = Math.round(myRate * myRateDiscountFactor);
  const myProjectPrice = myTotalMandays * myProjectRate;

  const amsBundle = useMemo(()=>{
    if (!selectedAMS) return { days:0, price:0 };
    const opt = AMS_CHOICES.find(a=>a.key===selectedAMS);
    const totalDays = opt.daysPerYear * 3;
    const discounted = Math.round(totalDays * (1 - amsDiscountPct/100));
    return { days: discounted, price: discounted * amsRate };
  },[selectedAMS, amsDiscountPct, amsRate]);

  const warnings = [];
  if (wrapperDays < 40) warnings.push("Wrapper effort is very low — PMO/Training/Hypercare may be under-scoped.");
  if (includeDRC && !selectedForms.has("tax_invoice")) warnings.push("DRC selected but Tax Invoice form is not selected.");

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <img src="/abeam-logo.png" alt="ABeam Consulting" className="h-8 w-auto" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                ABeam Malaysia — Cloud ERP Package Calculator
              </h1>
              <p className="text-xs text-slate-500">
                SG compares <b>functional only</b>; MY includes wrapper, technical, forms, localization.
              </p>
            </div>
          </div>

          {/* Mode + Tier controls */}
          <div className="flex items-center gap-2">
            {/* Mode */}
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

            {/* Tiers */}
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

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column */}
        <div className="lg:col-span-8 space-y-6">
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

          {/* Functional */}
          <Card
            title="Functional"
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
              {/* Left: functional checklist */}
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
                            <p className="text-xs text-slate-500 mt-1">Toggle to include/exclude this scope item in the package.</p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Right: multipliers */}
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

          {/* FRICEW */}
          <Card title="FRICEW — Forms & Common Interfaces">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-600 mb-2">Forms</p>
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
                      left={f.label}
                      right={`${f.days}d`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-600 mb-2">Common Interfaces</p>
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
                      left={i.label}
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
          <Card title="AMS Bundle (Optional, 3-year)">
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

        {/* Sticky summary (right) */}
        <aside className="lg:col-span-4">
          <div className="sticky top-6 space-y-3">
            <Card title="Summary & Comparison" subtitle={mode==='guided' ? `Tier: ${tier}` : undefined}>
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
                <hr className="my-2"/>
                <div className="text-sm font-semibold">Total Mandays: <Num value={myTotalMandays}/> d</div>
                <div className="text-sm">Project Rate: RM <Num value={myProjectRate}/></div>
                <div className="text-lg font-bold text-slate-900 mt-1">Project Price: RM <Num value={myProjectPrice}/></div>
                {selectedAMS && (<div className="text-sm mt-1">AMS (3y): <Num value={amsBundle.days}/> d → RM <Num value={amsBundle.price}/></div>)}
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

/* ---------- Local UI inputs ---------- */
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
