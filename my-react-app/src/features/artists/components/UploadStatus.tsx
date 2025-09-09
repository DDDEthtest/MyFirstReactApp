import React from 'react';

export type UploadStage = 'pending' | 'uploading' | 'done' | 'error';

export type UploadItem = {
  id: string;
  label: string;
  stage: UploadStage;
  cid?: string;
  uri?: string;
  error?: string;
};

function toGateway(uri?: string) {
  if (!uri) return undefined;
  const cid = uri.startsWith('ipfs://') ? uri.slice('ipfs://'.length) : uri;
  return `https://ipfs.filebase.io/ipfs/${cid}`;
}

export const UploadStatus: React.FC<{ items: UploadItem[] }> = ({ items }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="upload-panel">
      <div className="upload-header">Upload Status</div>
      <ul className="upload-list">
        {items.map((it) => (
          <li key={it.id} className={`upload-row stage-${it.stage}`}>
            <div className="upload-label">{it.label}</div>
            <div className="upload-stage">{it.stage}</div>
            {it.cid && (
              <div className="upload-links">
                <code className="cid">{it.cid.slice(0, 8)}…{it.cid.slice(-6)}</code>
                {toGateway(it.uri) && (
                  <a href={toGateway(it.uri)} target="_blank" rel="noreferrer" className="view-link">view</a>
                )}
              </div>
            )}
            {it.error && <div className="upload-error">{it.error}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UploadStatus;

