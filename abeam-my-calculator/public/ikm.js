(function(global){
  const B64URL = {
    enc: (u8)=> btoa(String.fromCharCode(...u8)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""),
    dec: (s)=> Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")), c=>c.charCodeAt(0))
  };
  async function sha256Hex(str){
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
  }
  async function exportIKM(payload){
    const raw = JSON.stringify(payload);
    const hash = await sha256Hex(raw);
    const body = B64URL.enc(new TextEncoder().encode(raw));
    const wrap64 = s => (s.match(/.{1,64}/g)||[s]).join("\n");
    const header = [
      "-----BEGIN IKM CAPSULE-----",
      "IKM-VERSION: 1.0",
      "PROFILE: INTERNAL",
      "NAME: "+(payload.originalFileName||payload.proposalId||"proposal")+".ikm",
      "DATE: "+new Date().toISOString(),
      "ALG: XCHACHA20-POLY1305",
      "KDF: ARGON2ID",
      "KDF-PARAMS: m=64MB,t=3,p=1",
      "RECIPIENTS: PASS:v1",
      "SALT: <demo>",
      "NONCE: <demo>",
      "PAYLOAD-SHA256: "+hash,
      "SIG: <unsigned-demo>",
      "-----BEGIN IKM PAYLOAD-----"
    ];
    return [header.join("\n"), wrap64(body), "-----END IKM PAYLOAD-----","-----END IKM CAPSULE-----"].join("\n")+"\n";
  }
  global.IKM = { exportIKM };
})(window);
