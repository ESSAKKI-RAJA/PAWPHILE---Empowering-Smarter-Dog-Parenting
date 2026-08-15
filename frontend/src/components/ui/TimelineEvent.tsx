import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface TimelineEventProps {
  time: string;
  dateStr: string;
  icon: React.ReactNode;
  title: string;
  summary: string;
  source: string;
  details?: React.ReactNode;
}

export function TimelineEvent({
  time,
  dateStr,
  icon,
  title,
  summary,
  source,
  details
}: TimelineEventProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex gap-4 relative">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-100 text-primary flex items-center justify-center shrink-0 z-10">
          {icon}
        </div>
        <div className="w-px h-full bg-line-200 absolute top-10 bottom-[-16px] left-5 -ml-[0.5px]" />
      </div>

      <div className="flex-1 pb-6">
        <div className="text-[11px] font-bold text-muted-400 uppercase tracking-wide mb-1">
          {dateStr} &middot; {time}
        </div>
        <div 
          className={`pw-card p-4 cursor-pointer transition-colors hover:border-primary/30 ${expanded ? 'border-primary/20 bg-ivory-50/30' : ''}`}
          onClick={() => details && setExpanded(!expanded)}
        >
          <div className="flex justify-between items-start gap-2">
            <div>
              <h4 className="text-15px font-bold text-ink-950 leading-tight mb-1">{title}</h4>
              <p className="text-14px text-muted-600 leading-snug mb-2">{summary}</p>
              <div className="text-[11px] font-medium text-muted-400 bg-black/5 px-2 py-0.5 rounded-full inline-flex">
                Added by {source}
              </div>
            </div>
            {details && (
              <button className="text-muted-400 hover:text-primary transition-colors mt-0.5 shrink-0">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
          {expanded && details && (
            <div className="mt-4 pt-4 border-t border-line-200 animate-slide-up text-14px text-ink-800 leading-relaxed">
              {details}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
