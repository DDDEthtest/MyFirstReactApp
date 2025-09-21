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

  function validateDimensions(width: number, height: number, key: AssetKey): string | null {
    // Aspect ratios
    const bgRatio = 1104 / 1472; // width / height
    const otherRatio = 760 / 1200;
    const ratio = width / Math.max(1, height);
    const epsilon = 0.01; // 1% tolerance

    if (key === 'background') {
      if (width < 552 || height < 736) return 'Background image too small. Minimum is 552x736.';
      if (Math.abs(ratio - bgRatio) > epsilon) return 'Background image must keep 1104:1472 aspect ratio (proportional).';
    } else {
      if (width < 380 || height < 600) return 'Asset image too small. Minimum is 380x600.';
      if (Math.abs(ratio - otherRatio) > epsilon) return 'Asset image must keep 760:1200 aspect ratio (proportional).';
    }
    return null;
  }

  const handlePick = (key: AssetKey, file: File) => {
    // File size guard: 1 MiB max
    if (file.size > 1_000_000) {
      alert('File is too large. Maximum size is 1MB.');
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const err = validateDimensions(img.width, img.height, key);
      if (err) {
        alert(err);
        URL.revokeObjectURL(url);
        return;
      }
      setPreviews((m) => ({ ...m, [key]: url }));
      onChange({ ...value, [key]: file });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      alert('Could not read image file.');
    };
    img.src = url;
  };

  return (
    <div>
      <div className="asset-grid">
        {DEFINITIONS.map((def) => {
          const file = value[def.key];
          const src = previews[def.key];
          return (
            <div key={def.key} className="asset-card">
              <div className="asset-title">
                {def.label} {def.required && <span className="req">*</span>}
              </div>
              <div className={`thumb${src ? ' has-file' : ''}`}>
                {src && <img src={src} alt={def.label} />}
              </div>
              <div className="upload">
                <UploadWidget label={file ? 'Replace' : 'Upload'} onFileSelected={(f) => handlePick(def.key, f)} />
              </div>
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
