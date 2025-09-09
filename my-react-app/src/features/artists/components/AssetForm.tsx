import React, { useState } from 'react';
import Button from '../../../shared/components/Button';

export type AssetFormValues = {
  name: string;
  description?: string;
  externalUrl?: string;
};

type Props = {
  onSubmit?: (values: AssetFormValues) => void;
  onChange?: (values: AssetFormValues) => void;
  showExternalUrl?: boolean;
  showSubmit?: boolean;
};

export const AssetForm: React.FC<Props> = ({ onSubmit, onChange, showExternalUrl = true, showSubmit = true }) => {
  const [values, setValues] = useState<AssetFormValues>({ name: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setValues((v) => {
      const next = { ...v, [name]: value } as AssetFormValues;
      if (onChange) onChange(next);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(values);
  };

  return (
    <form onSubmit={handleSubmit} className="artist-form">
      <div className="form-row">
        <label>Name <span style={{ color: '#dc2626' }}>*</span></label>
        <input required name="name" value={values.name} onChange={handleChange} className="input" />
      </div>
      <div className="form-row">
        <label>Description</label>
        <textarea name="description" value={values.description || ''} onChange={handleChange} className="textarea" />
      </div>
      {showExternalUrl && (
        <div className="form-row">
          <label>External URL</label>
          <input name="externalUrl" value={values.externalUrl || ''} onChange={handleChange} className="input" />
        </div>
      )}
      {showSubmit && (
        <Button type="submit" className="btn">Save Details</Button>
      )}
    </form>
  );
};

export default AssetForm;
