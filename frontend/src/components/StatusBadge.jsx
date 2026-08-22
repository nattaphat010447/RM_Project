import React from 'react';

const STATUS_MAP = {
  AVAILABLE: { variant: 'success', label: 'Available' },
  APPROVED: { variant: 'success', label: 'Approved' },
  COMPLETED: { variant: 'success', label: 'Completed' },
  RETURNED: { variant: 'success', label: 'Returned' },
  REQUESTED: { variant: 'info', label: 'Requested' },
  RUNNING: { variant: 'info', label: 'Running' },
  PENDING: { variant: 'warning', label: 'Pending' },
  RESERVED: { variant: 'warning', label: 'Reserved' },
  CHECKED_OUT: { variant: 'warning', label: 'Checked Out' },
  OVERDUE: { variant: 'danger', label: 'Overdue' },
  LOST: { variant: 'danger', label: 'Lost' },
  REJECTED: { variant: 'danger', label: 'Rejected' },
  CANCELLED: { variant: 'danger', label: 'Cancelled' },
};

const VARIANT_CLASSES = {
  success: 'badge-success',
  info: 'badge-info',
  warning: 'badge-warning',
  danger: 'badge-danger',
  neutral: 'bg-lumina-surface-alt text-lumina-text-muted',
};

const humanize = (value) =>
  String(value)
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const StatusBadge = ({ status, label, className = '' }) => {
  if (!status) return null;

  const key = String(status).toUpperCase();
  const entry = STATUS_MAP[key];
  const variantClass = VARIANT_CLASSES[entry ? entry.variant : 'neutral'];
  const displayText = label || (entry ? entry.label : humanize(key));

  return <span className={`inline-block ${variantClass} ${className}`}>{displayText}</span>;
};

export default StatusBadge;
