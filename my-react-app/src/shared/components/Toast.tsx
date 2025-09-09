import React from 'react';

type Props = {
  message: string;
  type?: 'info' | 'success' | 'error';
};

export const Toast: React.FC<Props> = ({ message, type = 'info' }) => {
  const colors: Record<string, string> = {
    info: 'bg-blue-600',
    success: 'bg-green-600',
    error: 'bg-red-600',
  };
  return (
    <div className={`fixed bottom-4 right-4 text-white px-3 py-2 rounded shadow ${colors[type]}`}>
      {message}
    </div>
  );
};

export default Toast;

