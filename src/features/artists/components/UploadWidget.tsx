import React, { useRef } from 'react';

type Props = {
  onFileSelected: (file: File) => void;
  label?: string;
};

export const UploadWidget: React.FC<Props> = ({ onFileSelected, label = 'Upload' }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="px-3 py-2 rounded bg-gray-100 border"
      >
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelected(f);
        }}
      />
    </div>
  );
};

export default UploadWidget;

