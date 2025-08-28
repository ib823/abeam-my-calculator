// src/proposalBridge.js
import { buildProposalPayloadV1 } from "./proposalPayload";

/** Opens proposal renderer in new tab with robust hand-off */
export function openProposalTab(calcState) {
  const payload = buildProposalPayloadV1(calcState || {});
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const key = `ikm:payload:${token}`;
  try { localStorage.setItem(key, JSON.stringify(payload)); } catch {}

  const url = `/proposal-renderer.html#lk=${encodeURIComponent(token)}`;
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    alert("Popup blocked. Please allow popups for this site to open the proposal preview.");
    return;
  }

  // safety net: postMessage spam for 1.5s
  const msg = { type: "proposalData", payload };
  let tries = 0;
  const t = setInterval(() => {
    tries++;
    try { w.postMessage(msg, "*"); } catch {}
    if (tries > 10) clearInterval(t);
  }, 150);
}
