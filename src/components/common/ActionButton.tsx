import React from 'react';
import { DuplicateIcon, DeleteIcon } from './Icons';

export type ActionButtonProps = {
  type: 'duplicate' | 'delete';
  onClick: () => void;
  className?: string;
};

export const ActionButton: React.FC<ActionButtonProps> = ({ type, onClick, className }) => {
  return (
    <button
      onClick={onClick}
      className={`action-button ${type} ${className}`}
    >
      {type === 'duplicate' && <DuplicateIcon size={16} />}
      {type === 'delete' && <DeleteIcon size={16} />}
      {type === 'duplicate' ? 'Duplicate' : 'Delete'}
    </button>
  );
};