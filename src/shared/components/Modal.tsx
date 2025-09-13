import React from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
};

export const Modal: React.FC<React.PropsWithChildren<Props>> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded shadow p-4 w-full max-w-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;

