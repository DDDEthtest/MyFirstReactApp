import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

export const Button: React.FC<Props> = ({ variant = 'primary', children, ...rest }) => {
  const base = 'inline-flex items-center justify-center px-3 py-2 rounded';
  const styles: Record<string, string> = {
    primary: 'bg-indigo-600 text-white',
    secondary: 'bg-gray-200 text-gray-900',
    ghost: 'bg-transparent text-indigo-600',
  };
  return (
    <button {...rest} className={[base, styles[variant], rest.className].filter(Boolean).join(' ')}>
      {children}
    </button>
  );
};

export default Button;

