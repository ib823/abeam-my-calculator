// src/utils/ikm.js
//
// A simple Integrity Keyed Manifest (IKM) generator.  It produces a
// plain text capsule with metadata headers and a base64-encoded JSON
// payload.  Real crypto can be added later.

export function generateIKMCapsule(payload, proposalId) {
  const json    = JSON.stringify(payload, null, 2);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  const lines = [];
  lines.push("-----BEGIN IKM CAPSULE-----");
  lines.push("IKM-Version: 1.0");
  lines.push(`Proposal-ID: ${proposalId}`);
  lines.push(`Created-At: ${new Date().toISOString()}`);
  lines.push("");
  // wrap at 64 chars per line
  for (let i = 0; i < encoded.length; i += 64) {
    lines.push(encoded.slice(i, i + 64));
  }
  lines.push("-----END IKM CAPSULE-----");
  return lines.join("\n");
}
