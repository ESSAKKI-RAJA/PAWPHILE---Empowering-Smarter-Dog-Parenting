import React from 'react';
import { Sparkles } from 'lucide-react';

interface AIResponseBlockProps {
  understand: string;
  mayMatter: string;
  toDoNow: string;
  escalation: string;
  followUp?: string;
}

export function AIResponseBlock({
  understand,
  mayMatter,
  toDoNow,
  escalation,
  followUp
}: AIResponseBlockProps) {
  return (
    <div className="bg-white border-l-4 border-lavender-600 rounded-r-2xl rounded-bl-2xl p-4 shadow-sm max-w-[90%] md:max-w-[85%] self-start animate-guided">
      <div className="flex items-center gap-1.5 mb-3 text-lavender-600">
        <Sparkles className="w-4 h-4" />
        <span className="text-[12px] font-bold uppercase tracking-wider">PAW AI</span>
      </div>
      
      <div className="flex flex-col gap-4">
        <div>
          <h4 className="text-13px font-bold text-ink-950 mb-1">What I understand</h4>
          <p className="text-14px text-muted-600 leading-relaxed">{understand}</p>
        </div>

        <div>
          <h4 className="text-13px font-bold text-ink-950 mb-1">What may matter</h4>
          <p className="text-14px text-muted-600 leading-relaxed">{mayMatter}</p>
        </div>

        <div>
          <h4 className="text-13px font-bold text-ink-950 mb-1">What you can do now</h4>
          <p className="text-14px text-ink-800 font-medium leading-relaxed bg-teal-50/50 p-2.5 rounded-lg border border-teal-100">{toDoNow}</p>
        </div>

        <div>
          <h4 className="text-13px font-bold text-safety-red-primary mb-1">Seek veterinary advice sooner if</h4>
          <p className="text-14px text-muted-600 leading-relaxed">{escalation}</p>
        </div>

        {followUp && (
          <div className="pt-3 border-t border-line-200 mt-1">
            <p className="text-14px font-bold text-primary">{followUp}</p>
          </div>
        )}
      </div>
    </div>
  );
}
