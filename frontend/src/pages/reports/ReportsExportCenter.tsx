import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Filter, CheckCircle2, Cloud, FileCode } from 'lucide-react';
import type { DogProfile } from '../../types/pawphile';

interface Props {
  dog: DogProfile;
  onGeneratePdf: () => void;
  isGeneratingPdf: boolean;
  onSaveToCloud: () => void;
  isSavingToCloud: boolean;
  onExportCsv: (type: 'symptoms' | 'vaccines' | 'deworming' | 'visits') => void;
}

export default function ReportsExportCenter({ 
  dog, 
  onGeneratePdf, 
  isGeneratingPdf, 
  onSaveToCloud, 
  isSavingToCloud,
  onExportCsv
}: Props) {
  const [dateRange, setDateRange] = useState('30');
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'csv' | 'xlsx'>('pdf');
  const [includeSections, setIncludeSections] = useState({
    summary: true,
    activity: true,
    nutrition: true,
    veterinary: true,
    behavior: true
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
      
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-3">
          <Download className="w-6 h-6 text-indigo-500" /> Export Center
        </h2>
        <p className="text-slate-500 mb-8 font-medium">Generate comprehensive offline reports or export raw data for external analysis.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Configuration Panel */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Format Selection */}
            <div>
              <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-slate-400" /> Format
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <button 
                  onClick={() => setSelectedFormat('pdf')}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                    selectedFormat === 'pdf' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 hover:border-indigo-300 hover:bg-white'
                  }`}
                >
                  <FileText className={`w-8 h-8 ${selectedFormat === 'pdf' ? 'text-indigo-500' : 'text-slate-400'}`} />
                  <span className="font-bold">PDF Report</span>
                </button>
                <button 
                  onClick={() => setSelectedFormat('csv')}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                    selectedFormat === 'csv' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 hover:border-emerald-300 hover:bg-white'
                  }`}
                >
                  <FileCode className={`w-8 h-8 ${selectedFormat === 'csv' ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span className="font-bold">Raw CSV</span>
                </button>
                <button 
                  onClick={() => setSelectedFormat('xlsx')}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                    selectedFormat === 'xlsx' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 hover:border-emerald-300 hover:bg-white'
                  }`}
                >
                  <FileSpreadsheet className={`w-8 h-8 ${selectedFormat === 'xlsx' ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span className="font-bold">Excel XLSX</span>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" /> Date Range
                </h3>
                <select 
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                >
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                  <option value="365">Last 1 Year</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              {selectedFormat === 'pdf' && (
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400 mb-4">Include Sections</h3>
                  <div className="space-y-2">
                    {[
                      { id: 'summary', label: 'Health Summary' },
                      { id: 'activity', label: 'Activity & Nutrition' },
                      { id: 'veterinary', label: 'Veterinary Records' },
                      { id: 'behavior', label: 'Behavioral Logs' }
                    ].map(section => (
                      <label key={section.id} className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                          (includeSections as any)[section.id] 
                            ? 'bg-indigo-500 border-indigo-500 text-white' 
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'
                        }`}>
                          {(includeSections as any)[section.id] && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={(includeSections as any)[section.id]}
                          onChange={(e) => setIncludeSections(prev => ({ ...prev, [section.id]: e.target.checked }))}
                        />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{section.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {(selectedFormat === 'csv' || selectedFormat === 'xlsx') && (
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400 mb-4">Select Dataset</h3>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => onExportCsv('symptoms')} className="text-left px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all">
                      Symptoms Logs
                    </button>
                    <button onClick={() => onExportCsv('vaccines')} className="text-left px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all">
                      Vaccination Records
                    </button>
                    <button onClick={() => onExportCsv('visits')} className="text-left px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all">
                      Veterinary Visits
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Panel */}
          <div className="lg:col-span-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-4">Export Summary</h3>
              <ul className="space-y-3 mb-8">
                <li className="flex justify-between text-sm">
                  <span className="text-slate-500">Target Profile</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{dog.name}</span>
                </li>
                <li className="flex justify-between text-sm">
                  <span className="text-slate-500">Format</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{selectedFormat}</span>
                </li>
                <li className="flex justify-between text-sm">
                  <span className="text-slate-500">Timeframe</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {dateRange === 'all' ? 'All Time' : `Last ${dateRange} Days`}
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              {selectedFormat === 'pdf' ? (
                <>
                  <button 
                    onClick={onGeneratePdf}
                    disabled={isGeneratingPdf || isSavingToCloud}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:shadow-none"
                  >
                    {isGeneratingPdf ? 'Generating...' : <><Download className="w-5 h-5" /> Download PDF</>}
                  </button>
                  <button 
                    onClick={onSaveToCloud}
                    disabled={isGeneratingPdf || isSavingToCloud}
                    className="w-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {isSavingToCloud ? 'Saving...' : <><Cloud className="w-5 h-5" /> Save to Cloud Drive</>}
                  </button>
                </>
              ) : (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-2xl text-center">
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-1">Raw Data Export</p>
                  <p className="text-xs font-medium text-emerald-600/70 dark:text-emerald-400/70">
                    Select a dataset from the filters panel to instantly download it as {selectedFormat.toUpperCase()}.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
