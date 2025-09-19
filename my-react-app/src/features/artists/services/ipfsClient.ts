export type UploadResult = { cid: string; uri: string };

// Filebase IPFS RPC endpoint (IPFS HTTP API compatible)
const FILEBASE_RPC_ADD = 'https://rpc.filebase.io/api/v0/add?pin=true';

function getFilebaseToken() {
  const raw = process.env.REACT_APP_FILEBASE_RPC_TOKEN;
  const token = (raw || '').trim().replace(/^['"]|['"]$/g, '');
  if (!token) throw new Error('Missing REACT_APP_FILEBASE_RPC_TOKEN');
  return token;
}

async function addViaFilebase(file: File | Blob, name?: string, extraQuery: string = ""): Promise<UploadResult> {
  const token = getFilebaseToken();
  const form = new FormData();
  // Ensure we pass a filename so gateways display a sensible name when saving
  const asFile = file instanceof File ? file : new File([file], name || 'upload.bin', { type: (file as Blob).type || 'application/octet-stream' });
  form.append('file', asFile);

  const url = extraQuery ? `${FILEBASE_RPC_ADD}&${extraQuery}` : FILEBASE_RPC_ADD;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const txt = await res.text();
  if (!res.ok) throw new Error(txt || res.statusText);

  // Filebase add returns a single JSON object or NDJSON. Extract last JSON line.
  const lines = txt.split(/\r?\n/).filter(Boolean);
  const last = lines[lines.length - 1];
  let parsed: any;
  try {
    parsed = JSON.parse(last);
  } catch {
    // Fallback to simple regex
    const m = last.match(/"Hash"\s*:\s*"([^"]+)"/);
    if (!m) throw new Error('Could not parse CID from add response');
    const cid = m[1];
    return { cid, uri: `ipfs://${cid}` };
  }

  const cid = parsed?.Hash || parsed?.Cid || parsed?.value?.cid;
  if (!cid) throw new Error('CID missing in add response');
  return { cid, uri: `ipfs://${cid}` };
}

export const ipfsClient = {
  async uploadFile(file: File): Promise<UploadResult> {
    return addViaFilebase(file, file.name);
  },

  async uploadBlob(name: string, blob: Blob): Promise<UploadResult> {
    const file = new File([blob], name, { type: blob.type || 'application/octet-stream' });
    return addViaFilebase(file, name);
  },

  async uploadJSON(obj: unknown): Promise<UploadResult> {
    const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
    return addViaFilebase(blob, 'metadata.json');
  },

  async uploadJSONDirectory(files: { path: string; obj: unknown }[]): Promise<UploadResult> {
    const token = getFilebaseToken();
    const form = new FormData();
    for (const f of files) {
      const blob = new Blob([JSON.stringify(f.obj)], { type: 'application/json' });
      const file = new File([blob], f.path, { type: 'application/json' });
      // Multiple 'file' parts; IPFS will honor the provided names
      form.append('file', file);
    }
    // wrap-with-directory returns a root directory CID as the last JSON line
    const res = await fetch(`${FILEBASE_RPC_ADD}&wrap-with-directory=true`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(txt || res.statusText);
    const lines = txt.split(/\r?\n/).filter(Boolean);
    const last = lines[lines.length - 1];
    let parsed: any;
    try { parsed = JSON.parse(last); } catch {}
    const cid = parsed?.Hash || parsed?.Cid || parsed?.value?.cid;
    if (!cid) throw new Error('CID missing in directory add response');
    return { cid, uri: `ipfs://${cid}` };
  }
};
