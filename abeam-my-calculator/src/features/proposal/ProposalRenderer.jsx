// src/features/proposal/ProposalRenderer.jsx
//
// Client-facing proposal renderer.  This component takes an estimator
// payload and a proposal ID, uses the adapters to derive the proposal
// DTO, and renders a polished A4-like document.  An IKM capsule is
// displayed at the end for internal copy-paste.

import React from 'react';
import { toProposalDTO } from '../../utils/adapters.js';
import { generateIKMCapsule } from '../../utils/ikm.js';

export default function ProposalRenderer({ payload, proposalId = "ABMY-2025-0001" }) {
  // Derive DTO.  Use default start date if none provided in payload.
  const dto = toProposalDTO(
    payload,
    payload.projectStartIso ?? undefined
  );
  const ikm = generateIKMCapsule(dto, proposalId);

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', color: '#0f172a', padding: '24px' }}>
      {/* Executive Summary */}
      <section style={{ marginBottom: '24px' }}>
        <h2>Executive Summary</h2>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{dto.meta.totalMandays.toLocaleString()}</div>
            <div>Mandays (est.)</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              RM {Number(dto.meta.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div>Total Services</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{dto.meta.timelineSummary}</div>
            <div>Indicative Timeline</div>
          </div>
        </div>
        <p style={{ color: '#475569' }}>
          Important: This is a computer‑generated estimate, non‑binding, subject to a signed Statement of Work (SOW).
        </p>
      </section>

      {/* Commercials & Investment */}
      <section style={{ marginBottom: '24px' }}>
        <h2>Commercials & Investment</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>Item</th>
              <th style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>Base (RM)</th>
              <th style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>Discount % / Amt</th>
              <th style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>Net (RM)</th>
              <th style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {dto.commercials.map((c, idx) => (
              <tr key={idx}>
                <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>{c.label}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>{c.base}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>
                  {c.percent}% / {c.amount}
                </td>
                <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>{c.net}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>{c.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Milestones */}
        <h3 style={{ marginTop: '16px' }}>Milestones & Payments</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>Milestone</th>
              <th style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>When</th>
              <th style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>Amount</th>
              <th style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {dto.milestones.map((m, idx) => (
              <tr key={idx}>
                <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>{m.name}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>{m.when}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>{m.amount}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>{m.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Legal & Notices */}
      <section style={{ marginBottom: '24px' }}>
        <h2>Legal & Notices</h2>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
          <h3>Status & Governing Law</h3>
          <p>This document is a non‑binding, computer‑generated estimate. All scope and commercials are subject to a signed SOW.</p>
          <p><strong>Governing Law (Malaysia):</strong> Disputes are subject to Malaysian law and jurisdiction. If the contracting entity is outside Malaysia, the governing law/venue is subject to mutual agreement in the definitive contract.</p>
        </div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
          <h3>Liability</h3>
          <p>Total liability is capped at fees paid for the services giving rise to the claim. Neither party is liable for indirect, incidental, punitive or consequential damages, loss of profits or data.</p>
        </div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
          <h3>Data Protection</h3>
          <p>Both parties shall comply with PDPA (Malaysia). Cross‑border transfers are handled in accordance with PDPA section 129 and Cross‑Border Transfer Guidelines. Where EU/UK data is involved, GDPR‑compliant safeguards apply.</p>
        </div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
          <h3>IP & Usage</h3>
          <p>All accelerators, methods and tools remain ABeam intellectual property. Upon full payment, the client receives a non‑exclusive internal use license. Third‑party IP (SAP®, Salesforce®, Oracle®, Microsoft®) remain the property of their licensors.</p>
        </div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
          <h3>Sanctions & Export Control</h3>
          <p>Each party shall comply with applicable export control and sanctions laws, including those of Malaysia, UN, EU, UK and US.</p>
        </div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
          <h3>Taxes</h3>
          <p>Fees are exclusive of taxes. Malaysian SST (8% effective 1 Mar 2024) applies where relevant. Payments to non‑residents may be subject to withholding under the Income Tax Act 1967 (s.109B).</p>
        </div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
          <h3>Trademarks</h3>
          <p>SAP and other names are trademarks of SAP SE. Salesforce, Microsoft, Oracle, and others are trademarks of their respective owners.</p>
        </div>
      </section>

      {/* Audit Trail */}
      <section style={{ marginBottom: '24px' }}>
        <h2>Appendix A — Inputs Audit Trail</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>Input</th>
              <th style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(dto.inputs).map((key) => (
              <tr key={key}>
                <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>{key}</td>
                <td style={{ border: '1px solid #e2e8f0', padding: '6px 8px' }}>
                  {String(dto.inputs[key])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ color: '#475569' }}>
          Generated at: {dto.audit.generatedAt}, Hash: {dto.audit.inputsHash}
        </p>
      </section>

      {/* IKM Capsule */}
      <section>
        <h2>IKM Capsule</h2>
        <textarea
          readOnly
          value={ikm}
          style={{ width: '100%', height: '200px', fontFamily: 'monospace', fontSize: '12px' }}
        />
      </section>
    </div>
  );
}
