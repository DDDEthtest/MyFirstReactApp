import React, { useMemo, useState } from 'react';
import UploadWidget from './UploadWidget';

export type AssetKey =
  | 'eyes'
  | 'head'
  | 'bottom'
  | 'upper'
  | 'hat'
  | 'hair'
  | 'left_accessory'
  | 'right_accessory'
  | 'background';

export type AssetFileMap = Partial<Record<AssetKey, File>>;

const DEFINITIONS: { key: AssetKey; label: string; required?: boolean }[] = [
  { key: 'eyes', label: 'Eyes', required: true },
  { key: 'head', label: 'Head', required: true },
  { key: 'upper', label: 'Upper', required: true },
  { key: 'bottom', label: 'Bottom', required: true },
  { key: 'background', label: 'Background', required: true },
  { key: 'hat', label: 'Hat' },
  { key: 'hair', label: 'Hair' },
  { key: 'left_accessory', label: 'Left Accessory' },
  { key: 'right_accessory', label: 'Right Accessory' },
];

type Props = {
  value: AssetFileMap;
  onChange: (next: AssetFileMap) => void;
};

export const MultiAssetUploader: React.FC<Props> = ({ value, onChange }) => {
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const requiredMissing = useMemo(() => {
    return DEFINITIONS.filter(d => d.required).some(d => !value[d.key]);
  }, [value]);

  const handlePick = (key: AssetKey, file: File) => {
    const url = URL.createObjectURL(file);
    setPreviews((m) => ({ ...m, [key]: url }));
    onChange({ ...value, [key]: file });
  };

  return (
    <div>
      <div className="asset-grid">
        {DEFINITIONS.map((def) => {
          const file = value[def.key];
          const src = previews[def.key];
          return (
            <div key={def.key} className="asset-card">
              <div className="asset-header">
                <div className="asset-title">
                  {def.label} {def.required && <span className="req">*</span>}
                </div>
                <UploadWidget label={file ? 'Replace' : 'Upload'} onFileSelected={(f) => handlePick(def.key, f)} />
              </div>
              {src && (
                <div className="thumb has-file">
                  <img src={src} alt={def.label} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {requiredMissing && (
        <div className="hint">Please upload all required assets marked with *</div>
      )}
    </div>
  );
};

export default MultiAssetUploader;
