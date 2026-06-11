import React from 'react';

import type { ApiDocRecord } from './ApiDocsTable';

interface ApiDocsFormProps {
  open: boolean;
  doc: ApiDocRecord | null;
  onClose: () => void;
  onSubmit: (data: ApiDocRecord) => void;
}

const ApiDocsForm: React.FC<ApiDocsFormProps> = ({ open, doc, onClose, onSubmit }) => {
  if (!open) return null;
  return (
    <div>
      <h2>API Docs Form</h2>
      <button type="button" onClick={() => onSubmit(doc ?? {})}>
        Save
      </button>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
};

export default ApiDocsForm; 
