// src/utils/adapters.js
//
// Adapters that convert the raw estimator payload into proposal and
// cockpit-ready data structures.  They derive sensible defaults for
// phases, milestones, commercials and audit information because the
// current calculator does not output these directly.

/**
 * Derive a proposal DTO from the estimator payload.
 * - Computes six default phases (Discover→Prepare→Explore→Realize→Deploy→Run)
 *   based on percentage splits of total mandays.
 * - Generates a milestones schedule.
 * - Calculates commercials (base, discount, net).
 * - Builds a timeline summary and a simple inputs hash.
 *
 * @param {Object} payload        The raw estimator state.
 * @param {string} [projectStartIso] Optional ISO date (YYYY-MM-DD) for the project start.
 *                                   If omitted, defaults to one week from today.
 * @returns {Object}              The proposal data transfer object.
 */
export function toProposalDTO(payload, projectStartIso) {
  // Helpers
  const roundTo = (n, decimals = 0) =>
    Number(Math.round(n + 'e' + decimals) + 'e-' + decimals);

  // Basic fields
  const totalMandays = payload.totalMandays ?? 0;
  const rate         = payload.blendedRate ?? payload.rate ?? 0;
  const discountPct  = payload.discount ?? 0;

  // Default project start (one week from today) unless supplied
  const startDate =
    projectStartIso != null
      ? new Date(projectStartIso)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Phase splits (percentage of total mandays)
  const splits = {
    Discover: 0.05,
    Prepare:  0.10,
    Explore:  0.20,
    Realize:  0.45,
    Deploy:   0.15,
    Run:      0.05
  };

  // Derive phases
  let current = new Date(startDate);
  const phases = [];
  for (const [name, pct] of Object.entries(splits)) {
    const md           = totalMandays * pct;
    const calendarDays = Math.ceil((md / 5) * 7); // approximate 5 workdays = 7 calendar
    const start        = new Date(current);
    const end          = new Date(start.getTime() + (calendarDays - 1) * 24 * 60 * 60 * 1000);
    phases.push({
      name,
      start: start.toISOString().slice(0, 10),
      end:   end.toISOString().slice(0, 10),
      mandays: Math.round(md)
    });
    current = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }

  // Commercials (only professional services for now)
  const baseFees   = totalMandays * rate;
  const discount   = baseFees * (discountPct / 100);
  const netFees    = baseFees - discount;
  const commercials = [
    {
      label: `Professional Services (${totalMandays} md @ RM${rate.toLocaleString(undefined, { minimumFractionDigits: 2 })})`,
      base:    baseFees.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      percent: discountPct,
      amount:  discount.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      net:     netFees.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      notes:   "Manday discount"
    },
    {
      label: "Grand Total",
      base:  "-",
      percent: 0,
      amount:  "-",
      net:    netFees.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      notes: ""
    }
  ];

  // Milestones schedule (hard-coded percentages)
  const milestones = [
    { name: "Contract Signing", when: "T0",               amount: "20% of project fees", notes: "Mobilization" },
    { name: "Discover Complete", when: "Week 4",         amount: "15% of project fees", notes: "Sign-off" },
    { name: "Explore Complete",  when: "Week 10",        amount: "20% of project fees", notes: "Fit-to-Standard sign-off" },
    { name: "Realize Complete",  when: "Week 20",        amount: "25% of project fees", notes: "Integration/UAT sign-off" },
    { name: "Go-Live",           when: "Week 28–32",     amount: "15% of project fees", notes: "Handover" },
    { name: "Run Complete",      when: "Post go-live",   amount: "5% of project fees",  notes: "Closure" }
  ];

  // Timeline summary (start to end)
  const timelineSummary = `${phases[0].start} – ${phases[phases.length - 1].end}`;

  // Simple hash (base64) of inputs for audit
  const inputsHash = btoa(
    unescape(encodeURIComponent(JSON.stringify(payload)))
  ).slice(0, 16);

  return {
    meta: {
      totalMandays,
      blendedRate: rate,
      totalCost: netFees,
      timelineSummary,
      currency: "MYR"
    },
    phases,
    commercials,
    milestones,
    inputs: payload,
    audit: {
      generatedAt: new Date().toISOString(),
      inputsHash
    }
  };
}

/**
 * Derive a cockpit DTO from the estimator payload.
 * - Uses the proposal DTO to inherit phases.
 * - Adds empty phaseAllocations and flag defaults.
 *
 * @param {Object} payload        The raw estimator state.
 * @param {string} [projectStartIso] Optional ISO start date.
 */
export function toCockpitDTO(payload, projectStartIso) {
  const proposal = toProposalDTO(payload, projectStartIso);
  const phaseAllocations = {};
  proposal.phases.forEach((p) => {
    phaseAllocations[p.name] = [];
  });
  return {
    phases: proposal.phases,
    phaseAllocations,
    flags: {
      amsSelected: false,
      expediteSelected: false,
      expeditePercent: 0
    }
  };
}
