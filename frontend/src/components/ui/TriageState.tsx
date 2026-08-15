import React from 'react';
import { SafetyStatus, StatusBadge } from './StatusBadge';

interface TriageStateProps {
  status: SafetyStatus;
  title?: string;
  summary: string;
  whatYouCanDo: string;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  escalationNote?: string;
  explanation?: string; // especially for Yellow
}

export function TriageState({
  status,
  title,
  summary,
  whatYouCanDo,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  escalationNote,
  explanation
}: TriageStateProps) {
  
  let bgClass, textColorClass, borderColorClass;
  let defaultTitle = '';
  let escalationLabel = 'Seek veterinary advice sooner if';

  switch (status) {
    case 'GREEN':
      bgClass = 'bg-safety-green-light';
      textColorClass = 'text-safety-green-border';
      borderColorClass = 'border-safety-green-border/20';
      defaultTitle = 'Monitor at home';
      break;
    case 'YELLOW':
      bgClass = 'bg-safety-yellow-light';
      textColorClass = 'text-safety-yellow-border';
      borderColorClass = 'border-safety-yellow-border/30';
      defaultTitle = 'Contact your veterinarian';
      break;
    case 'RED':
      bgClass = 'bg-safety-red-light';
      textColorClass = 'text-safety-red-border';
      borderColorClass = 'border-safety-red-primary border-l-4';
      defaultTitle = 'Seek immediate veterinary care';
      escalationLabel = 'Important notes for your visit';
      break;
    default:
      bgClass = 'bg-ivory-50';
      textColorClass = 'text-ink-950';
      borderColorClass = 'border-line-200';
      defaultTitle = 'Information';
      break;
  }

  const isRed = status === 'RED';

  return (
    <div className={`rounded-2xl p-5 ${bgClass} ${borderColorClass} ${!isRed ? 'border' : ''} shadow-sm w-full animate-emphasis`}>
      <div className="flex items-center gap-3 mb-3">
        <StatusBadge status={status} label={title || defaultTitle} />
      </div>
      
      <p className={`text-15px font-medium mb-5 ${textColorClass}`}>
        {summary}
      </p>

      {status === 'RED' ? (
        <div className="mb-5">
          <p className={`text-15px font-bold mb-4 ${textColorClass}`}>
            Call your veterinarian or the nearest emergency veterinary service now.
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={onPrimaryAction} className="pw-btn-destructive w-full">
              {primaryActionLabel}
            </button>
            {secondaryActionLabel && onSecondaryAction && (
              <button onClick={onSecondaryAction} className="pw-btn-secondary !bg-white/50 w-full !border-safety-red-border/30 !text-safety-red-border">
                {secondaryActionLabel}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-5">
          <h4 className={`text-14px font-bold mb-2 ${textColorClass} opacity-90`}>What you can do now</h4>
          <p className={`text-14px leading-relaxed mb-4 ${textColorClass} opacity-90`}>{whatYouCanDo}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={onPrimaryAction} className="pw-btn-primary w-full sm:w-auto text-14px !py-2.5 !min-h-[44px]">
              {primaryActionLabel}
            </button>
            {secondaryActionLabel && onSecondaryAction && (
              <button onClick={onSecondaryAction} className="pw-btn-secondary w-full sm:w-auto text-14px !py-2.5 !min-h-[44px] !bg-white/50">
                {secondaryActionLabel}
              </button>
            )}
          </div>
        </div>
      )}

      {explanation && status === 'YELLOW' && (
        <div className="mt-4 pt-4 border-t border-safety-yellow-border/10">
          <h4 className="text-13px font-bold text-safety-yellow-border opacity-90 mb-1">Why this is yellow</h4>
          <p className="text-13px text-safety-yellow-border opacity-80 leading-relaxed">{explanation}</p>
        </div>
      )}

      {escalationNote && (
        <div className={`mt-5 pt-4 border-t ${isRed ? 'border-safety-red-border/20' : 'border-black/5'}`}>
          <h4 className={`text-13px font-bold mb-1 ${textColorClass}`}>{escalationLabel}</h4>
          <p className={`text-13px leading-relaxed ${textColorClass} opacity-90`}>
            {escalationNote}
          </p>
        </div>
      )}
    </div>
  );
}
