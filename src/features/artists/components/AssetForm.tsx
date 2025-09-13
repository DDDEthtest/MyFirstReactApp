import React, { useState } from 'react';
import Button from '../../../shared/components/Button';

export type AssetFormValues = {
  name: string;
  description?: string;
  externalUrl?: string;
};

type Props = {
  onSubmit: (values: AssetFormValues) => void;
};

export const AssetForm: React.FC<Props> = ({ onSubmit }) => {
  const [values, setValues] = useState<AssetFormValues>({ name: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium">Name</label>
        <input name="name" value={values.name} onChange={handleChange} className="border rounded px-2 py-1 w-full" />
      </div>
      <div>
        <label className="block text-sm font-medium">Description</label>
        <textarea name="description" value={values.description || ''} onChange={handleChange} className="border rounded px-2 py-1 w-full" />
      </div>
      <div>
        <label className="block text-sm font-medium">External URL</label>
        <input name="externalUrl" value={values.externalUrl || ''} onChange={handleChange} className="border rounded px-2 py-1 w-full" />
      </div>
      <Button type="submit">Save Details</Button>
    </form>
  );
};

export default AssetForm;

