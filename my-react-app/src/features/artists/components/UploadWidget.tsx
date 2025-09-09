import React, { useRef } from 'react';

type Props = {
  onFileSelected: (file: File) => void;
  label?: string;
  accept?: string;
};

export const UploadWidget: React.FC<Props> = ({ onFileSelected, label = 'Upload', accept = 'image/*' }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="upload">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="btn secondary"
      >
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="file-input-hidden"
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelected(f);
        }}
      />
    </div>
  );
};

export default UploadWidget;
