import React from "react";
import { FileText, ExternalLink } from "lucide-react";
import type { CareGuide } from "../../data/careGuides";

export default function GuideCard({ guide }: { guide: CareGuide }) {
  const isPdf = guide.pdfUrl?.toLowerCase().endsWith(".pdf");

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20">
          <FileText className="w-5 h-5 text-teal-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-black">{guide.title}</h4>
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
              {guide.category}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
            {guide.description}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-black text-slate-500">
              {guide.organization}
            </span>
            <span className="ml-auto flex items-center gap-2">
              <a
                href={guide.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-black px-3 py-2 rounded-xl bg-slate-50 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-900/20 border border-slate-200 dark:border-slate-700"
              >
                Open Guide{" "}
                <ExternalLink className="w-3 h-3 inline-block ml-2" />
              </a>
              {isPdf && (
                <a
                  href={guide.pdfUrl}
                  download
                  className="text-xs font-bold px-3 py-2 rounded-xl bg-white/5 border border-slate-200 dark:border-slate-700"
                >
                  Download PDF
                </a>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
