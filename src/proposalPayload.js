// src/proposalPayload.js
// Works without startISO. Uses your existing sidebar totals + FTE/weeks.

const fmtRM2 = (n) =>
  Number(n || 0).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const parseISO = (s) => new Date(s + "T00:00:00");
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;

const nextMondayISO = () => {
  const d = new Date();
  const add = (8 - ((d.getDay() || 7))) % 7; // days till next Mon
  d.setDate(d.getDate() + (add || 7));
  return d.toISOString().slice(0, 10);
};

function addWorkdays(startISO, workdays) {
  let d = parseISO(startISO);
  let remain = Math.max(0, Math.floor(workdays));
  while (remain > 0) {
    d.setDate(d.getDate() + 1);
    if (!isWeekend(d)) remain--;
  }
  return d.toISOString().slice(0, 10);
}

function daysBetween(aISO, bISO) {
  const a = parseISO(aISO), b = parseISO(bISO);
  return Math.max(1, Math.ceil((+b - +a) / 86400000));
}

/** Phase split by % of total effort (stable + editable later) */
const PHASE_SPLIT = {
  Discover: 0.05,
  Prepare:  0.10,
  Explore:  0.20,
  Realize:  0.45,
  Deploy:   0.15,
  Run:      0.05,
};

/**
 * Make a phase schedule from inputs that your estimator already has.
 * If estimatedWeeks is present we respect it; otherwise we derive from md / (FTE*WD/Wk).
 */
function scheduleFromEstimator({
  totalMandays,
  teamSize = 5,
  workdays = 5,
  startISO,            // optional; if absent we pick next Monday
  estimatedWeeks,      // your "Estimated Timeline" card
}) {
  const start = startISO || nextMondayISO();

  // If you gave "22 weeks", translate that into a total of workdays and spread by %.
  // Otherwise, compute weeks from md / (teamSize*workdays).
  const totalWeeks = Math.max(
    1,
    Math.round(
      estimatedWeeks ||
        (Number(totalMandays || 0) / Math.max(1, teamSize * Math.max(1, workdays)))
    )
  );

  const totalWorkdays = totalWeeks * Math.max(1, workdays);

  const phases = Object.keys(PHASE_SPLIT).map((name) => ({
    name,
    mandays: Math.round(Number(totalMandays || 0) * PHASE_SPLIT[name]),
    // Duration target in workdays: proportion of total workdays
    workdays: Math.max(1, Math.round(totalWorkdays * PHASE_SPLIT[name])),
  }));

  // Walk the calendar in workdays per phase
  let cursor = start;
  const out = [];
  for (const p of phases) {
    const s = cursor;
    const endISO = addWorkdays(s, p.workdays - 1); // inclusive of first day
    out.push({ name: p.name, start: s, end: endISO, mandays: p.mandays });
    // next phase starts on next calendar day
    const n = parseISO(endISO); n.setDate(n.getDate() + 1);
    cursor = n.toISOString().slice(0, 10);
  }
  return out;
}

function scopeColumnsFromSelection(selection) {
  return [
    { title: "Selected Capabilities", items: selection?.capabilities || [
      "General Ledger Accounting","Asset Accounting","Payment Processing","Open Item Management"
    ]},
    { title: "Forms", items: selection?.forms || ["Tax Invoice","Credit Note","Debit Note","Remittance Advice"] },
    { title: "Interfaces", items: selection?.interfaces || ["Bank Export (payment)","SST Reporting (LHDN)"] },
  ];
}

export function buildProposalPayloadV1(calc) {
  // ---- pull from your estimator (use defaults if absent)
   // If a canonical block is present, prefer it
  const F = calc.financials || {};
  const N = (v, d=0) => (Number.isFinite(+v) ? +v : d);

  // Mandays buckets
  const totals = {
    functional: N(calc.functional),
    fricew:     N(calc.fricew),
    technical:  N(calc.technical),
    wrapper:    N(calc.wrapper),
  };
  const totalMandays = N(calc.totalMandays, totals.functional + totals.fricew + totals.technical + totals.wrapper);

  // Commercial knobs
  const myRate   = N(calc.myRate, 2000);
  const mdPct    = N(calc.mandayDiscount);
  const rtPct    = N(calc.rateDiscount);
  const rounding = N(calc.rounding);

  // Prefer canonical numbers
  const baseDays   = N(F.baseDays, totalMandays);
  const baseRate   = N(F.baseRate, myRate);
  const baseAmount = N(F.baseAmount, baseDays * baseRate);

  const mandayDaysDelta = N(F.mandayDaysDelta, Math.round(baseDays * mdPct / 100));
  const mdAmt           = N(F.mdAmt, mandayDaysDelta * baseRate);

  const finalDays = N(F.finalDays, baseDays - mandayDaysDelta);
  const finalRate = N(F.finalRate, Math.round(baseRate * (1 - rtPct/100)));
  const rtAmt     = N(F.rtAmt, finalDays * (baseRate - finalRate));

  const implementationSubtotal = N(F.implementationSubtotal, finalDays * finalRate);

  const amsMonths  = N(calc.amsMonths);
  const amsMonthly = N(calc.amsMonthly, 45000);
  const amsPrice   = N(F.amsPrice, amsMonths > 0 ? amsMonths * amsMonthly : 0);

  const grandTotal = N(F.grandTotal, implementationSubtotal + amsPrice + rounding);
  
  const clientName   = calc.clientName || "Unnamed Client";
  const clientShort  = (calc.clientShort || clientName).toUpperCase().replace(/\s+/g,"");
  const packageTier  = calc.packageTier || "Standard";

  const totals = {
    functional: Number(calc.functional || 0),
    fricew:     Number(calc.fricew || 0),
    technical:  Number(calc.technical || 0),
    wrapper:    Number(calc.wrapper || 0),
  };
  const totalMandays = totals.functional + totals.fricew + totals.technical + totals.wrapper;

  const teamSize     = Number(calc.teamSize || 5);
  const workdays     = Number(calc.workdays || 5);
  const estimatedWeeks = Number(calc.estimatedWeeks || 0); // if you have it, pass it

  const myRate   = Number(calc.myRate || 2000);
  const rounding = Number(calc.rounding || 0);
  const mdDisc   = Number(calc.mandayDiscount || 0); // %
  const rateDisc = Number(calc.rateDiscount  || 0); // %

  // commercials
  const baseServices = totalMandays * myRate;
  const mdDiscAmt    = Math.round((baseServices * mdDisc) / 100);
  const rateDiscAmt  = Math.round((totalMandays * (myRate * rateDisc) / 100));
  const afterDisc    = baseServices - mdDiscAmt - rateDiscAmt;

  // AMS (optional)
  const amsMonths  = Number(calc.amsMonths  || 0);
  const amsMonthly = Number(calc.amsMonthly || 45000);
  const amsTotal   = amsMonths > 0 ? amsMonths * amsMonthly : 0;

  const grandTotal = afterDisc + amsTotal + rounding;

  // ---- proposal id (per-client, per-day)
  const now = new Date();
  const dd  = String(now.getDate()).padStart(2,"0");
  const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][now.getMonth()];
  const yy  = String(now.getFullYear()).slice(-2);
  const key = `seq:${clientShort}:${dd}-${mon}-${yy}`;
  const seq = (parseInt(sessionStorage.getItem(key) || "0", 10) + 1);
  sessionStorage.setItem(key, String(seq));
  const proposalId = `ABMY-${dd}-${mon}-${yy}-${String(seq).padStart(3,"0")}`;

  // ---- timeline from estimator inputs (no start date required)
  const phases = scheduleFromEstimator({
    totalMandays, teamSize, workdays,
    startISO: calc.startISO,            // optional override (if you add a field later)
    estimatedWeeks                     // from your “Estimated Timeline”
  });
  const start = phases[0]?.start;
  const end   = phases[phases.length-1]?.end;
  const weeks = Math.max(1, Math.ceil(daysBetween(start, end)/7));
  const timelineSummary = `${new Date(start).toLocaleDateString("en-GB",{month:"short",year:"numeric"})}–${new Date(end).toLocaleDateString("en-GB",{month:"short",year:"numeric"})} (${weeks} weeks)`;

  // ---- milestones (percent of services portion)
  const pct = {
    "Contract Signing": 0.20,
    "Discover Complete": 0.15,
    "Explore Complete": 0.20,
    "Realize Complete": 0.25,
    "Deploy (Go-Live)": 0.15,
    "Run (Hypercare + 30d)": 0.05,
  };
  const lookup = Object.fromEntries(phases.map(p=>[p.name,p]));
  const milestones = [
    { name:"Contract Signing",          when:"T0",                                   percent:20, notes:"Mobilization" },
    { name:"Discover Complete",         when:`End of Discover (${lookup.Discover?.end||"-"})`, percent:15, notes:"Sign-off" },
    { name:"Explore Complete",          when:`End of Explore (${lookup.Explore?.end||"-"})`,   percent:20, notes:"Fit-to-Standard sign-off" },
    { name:"Realize Complete",          when:`End of Realize (${lookup.Realize?.end||"-"})`,   percent:25, notes:"UAT sign-off" },
    { name:"Deploy (Go-Live)",          when:`Go-Live (${lookup.Deploy?.end||"-"})`,           percent:15, notes:"Handover" },
    { name:"Run (Hypercare + 30d)",     when:"Post go-live",                                   percent:5,  notes:"Closure" },
  ].map(m => ({...m, amount:`RM ${fmtRM2(afterDisc * m.percent/100)}`}));

  // ---- commercials table (2dp)
  const commercials = [
    {
      label: `Professional Services (${totalMandays} md @ RM ${fmtRM2(myRate)})`,
      base:  baseServices,
      percent: mdDisc,
      amount: mdDiscAmt,
      net:   baseServices - mdDiscAmt,
      notes: "Manday discount",
    },
    {
      label: "Rate Discount",
      base:  "-",
      percent: rateDisc,
      amount: rateDiscAmt,
      net:   (baseServices - mdDiscAmt) - rateDiscAmt,
      notes: "",
    },
    {
      label: amsMonths>0 ? `AMS (${amsMonths} months @ RM ${fmtRM2(amsMonthly)}/mth)` : "AMS (optional)",
      base:  amsTotal || "-",
      percent: 0,
      amount: 0,
      net:   amsTotal || 0,
      notes: amsMonths>0 ? "Included" : "Excluded",
    },
    { label:"Rounding", base:"-", percent:0, amount:"-", net: rounding, notes:"Commercial rounding" },
    { label:"<b>Grand Total</b>", base:"-", percent:0, amount:"-", net: grandTotal, notes:"" },
  ];

  // ---- scope + audit
  const scopeColumns = scopeColumnsFromSelection(calc.selection);
  const inputAudit = [
    { key:"Package Tier", value: packageTier, notes:"Essential/Standard/Premium" },
    { key:"MY Project Rate (RM/day)", value:`RM ${fmtRM2(myRate)}`, notes:"Estimator input" },
    { key:"Manday Discount %", value:`${mdDisc}%`, notes:"" },
    { key:"Rate Discount %",   value:`${rateDisc}%`, notes:"" },
    { key:"AMS Months",        value: amsMonths || 0, notes:"Optional" },
    { key:"Rounding (RM)",     value:`RM ${fmtRM2(rounding)}`, notes:"Applied at total" },
    { key:"Team Size (FTE)",   value: teamSize, notes:"" },
    { key:"Working Days/Week", value: workdays, notes:"" },
    { key:"Estimated Weeks",   value: estimatedWeeks || Math.ceil(totalMandays / Math.max(1, teamSize*workdays)), notes:"Derived if blank" },
  ];
  const inputsHash = (()=>{ try{
    const s = JSON.stringify(inputAudit); let x=0; for(let i=0;i<s.length;i++) x=(x*131 + s.charCodeAt(i))>>>0; return x.toString(16).padStart(8,"0");
  }catch{ return "00000000"; }})();

  return {
    clientName, clientShort, packageTier,
    proposalId,
    validityDays: 14,
    generatedAt: new Date().toLocaleString("en-GB",{hour12:true}),
    watermark: !!calc.watermark,

    totalMandays, grandTotal,

    timelineSummary,
    phases,
    blackouts: calc.blackouts || [],

    commercials,
    priceNote: "Client pricing = mandays × rate; staffing affects timeline only. Expedite surcharge applies only if explicitly selected.",

    milestones,

    scopeColumns,

    inputAudit, inputsHash,
    generatorName: "ABeam SAP Cloud ERP Estimator",
    generatorEmail:"presales@abeam.my",
    ip: calc.ip || "203.0.113.24",
  };
}
