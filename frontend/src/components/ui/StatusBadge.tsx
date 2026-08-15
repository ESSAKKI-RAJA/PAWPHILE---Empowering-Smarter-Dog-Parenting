import React from 'react';
import { CheckCircle, AlertTriangle, AlertOctagon, Info } from 'lucide-react';

export type SafetyStatus = 'GREEN' | 'YELLOW' | 'RED' | 'INFO';

interface StatusBadgeProps {
  status: SafetyStatus;
  label: string;
  description?: string;
  className?: string;
}

export function StatusBadge({ status, label, description, className = '' }: StatusBadgeProps) {
  let bgColor, textColor, borderColor, Icon;

  switch (status) {
    case 'GREEN':
      bgColor = 'bg-safety-green-light';
      textColor = 'text-safety-green-border';
      borderColor = 'border-safety-green-border/20';
      Icon = CheckCircle;
      break;
    case 'YELLOW':
      bgColor = 'bg-safety-yellow-light';
      textColor = 'text-safety-yellow-border';
      borderColor = 'border-safety-yellow-border/20';
      Icon = AlertTriangle;
      break;
    case 'RED':
      bgColor = 'bg-safety-red-light';
      textColor = 'text-safety-red-border';
      borderColor = 'border-safety-red-border/20';
      Icon = AlertOctagon;
      break;
    case 'INFO':
    default:
      bgColor = 'bg-safety-blue-light';
      textColor = 'text-safety-blue-border';
      borderColor = 'border-safety-blue-border/20';
      Icon = Info;
      break;
  }

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${bgColor} ${borderColor}`}>
        <Icon className={`w-3.5 h-3.5 ${textColor}`} strokeWidth={2.5} />
        <span className={`text-[12px] font-bold uppercase tracking-wide ${textColor}`}>
          {label}
        </span>
      </div>
      {description && (
        <span className="text-[11px] font-medium text-muted-600 pl-1">{description}</span>
      )}
    </div>
  );
}
