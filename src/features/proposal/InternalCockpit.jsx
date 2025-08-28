// src/features/proposal/InternalCockpit.jsx
//
// Internal resource planning cockpit.  Consultants can edit phase dates,
// assign roles (FTE, weeks, notes) per phase, export weekly CSV, and
// copy an IKM capsule.  Use behind a feature flag only.

import React, { useState } from 'react';
import { toCockpitDTO } from '../../utils/adapters.js';
import { generateIKMCapsule } from '../../utils/ikm.js';

// Helper: start of week (Monday) for a given date
function startOfWeek(d) {
  const x = new Date(d);
  const delta = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - delta);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Helper: end of week (Sunday)
function endOfWeek(d) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

// Helper: count weekdays between two dates (inclusive)
function countWorkdays(a, b) {
  const s = new Date(a);
  const e = new Date(b);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  let c = 0;
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) c++;
  }
  return c;
}

export default function InternalCockpit({ payload, proposalId = "ABMY-2025-0001" }) {
  const [dto, setDto] = useState(() =>
    toCockpitDTO(payload, payload.projectStartIso ?? undefined)
  );

  // Update a date for a phase
  const handleDateChange = (phaseName, which, value) => {
    setDto((prev) => {
      const updated = { ...prev };
      updated.phases = updated.phases.map((p) =>
        p.name === phaseName ? { ...p, [which]: value } : p
      );
      return updated;
    });
  };

  // Add a new role row to a phase
  const handleAddRole = (phaseName) => {
    const role      = prompt("Role (e.g. FI Consultant):");
    const seniority = prompt("Seniority (e.g. Mid):");
    const fte       = parseFloat(prompt("FTE (0.1–1.0):") || "1.0");
    const weeks     = parseInt(prompt("Weeks in phase:") || "1", 10);
    const notes     = prompt("Notes:") || "";
    setDto((prev) => {
      const alloc = prev.phaseAllocations[phaseName] || [];
      return {
        ...prev,
        phaseAllocations: {
          ...prev.phaseAllocations,
          [phaseName]: [...alloc, { role, seniority, fte, weeks, notes }],
        },
      };
    });
  };

  // Export weekly CSV
  const exportCSV = () => {
    // Determine overall project window
    const starts = dto.phases.map((p) => new Date(p.start));
    const ends   = dto.phases.map((p) => new Date(p.end));
    const minD   = new Date(Math.min(...starts));
    const maxD   = new Date(Math.max(...ends));

    // Build weekly headers
    const weekStarts = [];
    let c = startOfWeek(minD);
    const e = endOfWeek(maxD);
    while (c <= e) {
      weekStarts.push(new Date(c));
      c.setDate(c.getDate() + 7);
    }

    const fmtDDMMMYY = (d) => {
      const mons = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const day  = String(d.getDate()).padStart(2,'0');
      const mon  = mons[d.getMonth()];
      const yr   = String(d.getFullYear()).slice(-2);
      return `${day}-${mon}-${yr}`;
    };

    const header = ["Resource","Start date","End date", ...weekStarts.map(fmtDDMMMYY)];
    const rows = [header];

    dto.phases.forEach((ph) => {
      const phStart = new Date(ph.start);
      const phEnd   = new Date(ph.end);
      // Weeks overlapping with this phase
      const overlapping = weekStarts.filter(
        (ws) => !(endOfWeek(ws) < phStart || ws > phEnd)
      );
      (dto.phaseAllocations[ph.name] || []).forEach((r) => {
        const row = new Array(header.length).fill("");
        row[0] = `${ph.name} — ${r.role} (${r.seniority})`;
        row[1] = fmtDDMMMYY(phStart);
        row[2] = fmtDDMMMYY(phEnd);
        const weeksToUse = Math.max(1, r.weeks);
        let assigned = 0;
        weekStarts.forEach((ws, idx) => {
          if (assigned >= weeksToUse) return;
          const wEnd = endOfWeek(ws);
          const overlaps = !(wEnd < phStart || ws > phEnd);
          if (!overlaps) return;
          const wStartClamped = ws < phStart ? phStart : ws;
          const wEndClamped   = wEnd > phEnd ? phEnd : wEnd;
          const wd = countWorkdays(wStartClamped, wEndClamped);
          const md = parseFloat((r.fte * wd).toFixed(1));
          row[3 + idx] = md > 0 ? String(md) : "0";
          assigned++;
        });
        rows.push(row);
      });
    });

    const esc = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = rows.map((cols) => cols.map(esc).join(",")).join("\n");
    const fname = `${proposalId}_resource_plan.csv`;
    const blob  = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url   = URL.createObjectURL(blob);
    const link  = document.createElement('a');
    link.href = url;
    link.download = fname;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Copy IKM capsule
  const copyIKM = () => {
    const capsule = generateIKMCapsule(dto, proposalId);
    navigator.clipboard.writeText(capsule).then(() => {
      alert("IKM capsule copied to clipboard.");
    });
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'Segoe UI, sans-serif', color: '#0f172a' }}>
      <h2>Internal Resource Cockpit</h2>
      <p style={{ color: '#475569' }}>
        Adjust phase dates and allocate resources. Pricing remains tied to total mandays;
        Expedite adds a surcharge only when selected.
      </p>

      {dto.phases.map((ph) => (
        <div
          key={ph.name}
          style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}
        >
          <h3>{ph.name}</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
            <label>
              Start:&nbsp;
              <input
                type="date"
                value={ph.start}
                onChange={(e) => handleDateChange(ph.name, 'start', e.target.value)}
              />
            </label>
            <button
              onClick={() =>
                handleDateChange(
                  ph.name,
                  'start',
                  new Date(new Date(ph.start).setDate(new Date(ph.start).getDate() - 1))
                    .toISOString()
                    .slice(0, 10)
                )
              }
            >
              -1d
            </button>
            <button
              onClick={() =>
                handleDateChange(
                  ph.name,
                  'start',
                  new Date(new Date(ph.start).setDate(new Date(ph.start).getDate() + 1))
                    .toISOString()
                    .slice(0, 10)
                )
              }
            >
              +1d
            </button>
            <label>
              End:&nbsp;
              <input
                type="date"
                value={ph.end}
                onChange={(e) => handleDateChange(ph.name, 'end', e.target.value)}
              />
            </label>
            <button
              onClick={() =>
                handleDateChange(
                  ph.name,
                  'end',
                  new Date(new Date(ph.end).setDate(new Date(ph.end).getDate() - 1))
                    .toISOString()
                    .slice(0, 10)
                )
              }
            >
              -1d
            </button>
            <button
              onClick={() =>
                handleDateChange(
                  ph.name,
                  'end',
                  new Date(new Date(ph.end).setDate(new Date(ph.end).getDate() + 1))
                    .toISOString()
                    .slice(0, 10)
                )
              }
            >
              +1d
            </button>
            <button onClick={() => handleAddRole(ph.name)}>Add Role</button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #e2e8f0', padding: '4px 6px' }}>Role</th>
                <th style={{ border: '1px solid #e2e8f0', padding: '4px 6px' }}>Seniority</th>
                <th style={{ border: '1px solid #e2e8f0', padding: '4px 6px' }}>FTE</th>
                <th style={{ border: '1px solid #e2e8f0', padding: '4px 6px' }}>Weeks</th>
                <th style={{ border: '1px solid #e2e8f0', padding: '4px 6px' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {(dto.phaseAllocations[ph.name] || []).map((r, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #e2e8f0', padding: '4px 6px' }}>{r.role}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '4px 6px' }}>{r.seniority}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '4px 6px' }}>{r.fte}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '4px 6px' }}>{r.weeks}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '4px 6px' }}>{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Flags */}
      <div style={{ margin: '12px 0' }}>
        <label>
          <input
            type="checkbox"
            checked={dto.flags.amsSelected}
            onChange={(e) =>
              setDto((prev) => ({
                ...prev,
                flags: { ...prev.flags, amsSelected: e.target.checked },
              }))
            }
          />
          &nbsp;Enable AMS
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={dto.flags.expediteSelected}
            onChange={(e) =>
              setDto((prev) => ({
                ...prev,
                flags: { ...prev.flags, expediteSelected: e.target.checked },
              }))
            }
          />
          &nbsp;Expedite (surcharge applies)
        </label>
        {dto.flags.expediteSelected && (
          <div>
            Premium %:&nbsp;
            <input
              type="number"
              step="0.5"
              value={dto.flags.expeditePercent}
              onChange={(e) =>
                setDto((prev) => ({
                  ...prev,
                  flags: {
                    ...prev.flags,
                    expeditePercent: parseFloat(e.target.value || "0"),
                  },
                }))
              }
            />
          </div>
        )}
      </div>

      {/* Export actions */}
      <div>
        <button onClick={exportCSV}>Export CSV</button>
        &nbsp;
        <button onClick={copyIKM}>Copy IKM Capsule</button>
      </div>
    </div>
  );
}
