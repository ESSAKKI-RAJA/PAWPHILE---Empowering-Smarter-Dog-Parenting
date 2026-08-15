import React from 'react';

interface AttentionCardProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  status?: 'YELLOW' | 'RED';
}

export function AttentionCard({ title, description, actionLabel, onAction, status = 'YELLOW' }: AttentionCardProps) {
  const isRed = status === 'RED';
  
  return (
    <div className={`rounded-xl border flex flex-col p-4 relative overflow-hidden bg-card
      ${isRed ? 'border-safety-red-border/30' : 'border-safety-yellow-border/30'}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isRed ? 'bg-safety-red-primary' : 'bg-safety-yellow-primary'}`} />
      <div className="pl-2">
        <h3 className="text-16px font-bold text-ink-950 mb-1 leading-snug">{title}</h3>
        <p className="text-14px font-medium text-muted-600 mb-4 leading-relaxed">{description}</p>
        <button 
          onClick={onAction}
          className="w-full pw-btn-secondary !min-h-[40px] !py-2"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

interface NextActionCardProps {
  title: string;
  reason: string;
  actionLabel: string;
  onAction: () => void;
  icon?: React.ReactNode;
}

export function NextActionCard({ title, reason, actionLabel, onAction, icon }: NextActionCardProps) {
  return (
    <div className="pw-card pw-card-compact pw-card-hoverable flex items-start gap-3">
      {icon && (
        <div className="w-10 h-10 rounded-full bg-teal-50 text-primary flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1">
        <h4 className="text-15px font-bold text-ink-950 leading-tight mb-1">{title}</h4>
        <p className="text-13px text-muted-600 mb-3 leading-snug">{reason}</p>
        <button 
          onClick={onAction}
          className="text-14px font-bold text-primary hover:text-teal-600 transition-colors"
        >
          {actionLabel} &rarr;
        </button>
      </div>
    </div>
  );
}
