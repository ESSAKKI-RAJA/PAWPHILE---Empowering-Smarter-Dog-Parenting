import { useMemo, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Download, HeartPulse, Activity, Utensils, Brain, Moon, ShieldCheck, Stethoscope, BookOpen, Clock, AlertTriangle, Menu, X } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import { usePawphileData } from '../context/PawphileDataContext';
import { generatePdfReport } from '../services/apiClient';
import { uploadPdfReportToStorage, saveReportMetadata } from '../services/reportService';
import { generateSimulatedData } from '../utils/reportDataSimulator';

// Import subcomponents
import ReportsDashboard from './reports/ReportsDashboard';
import HealthSummaryReport from './reports/HealthSummaryReport';
import ActivityReport from './reports/ActivityReport';
import NutritionFoodReport from './reports/NutritionFoodReport';
import BehaviorAnalyticsReport from './reports/BehaviorAnalyticsReport';
import SleepAnalyticsReport from './reports/SleepAnalyticsReport';
import VaccinationReport from './reports/VaccinationReport';
import VeterinaryReport from './reports/VeterinaryReport';
import VetNotesReport from './reports/VetNotesReport';
import HealthTimelineReport from './reports/HealthTimelineReport';
import AiRiskReport from './reports/AiRiskReport';
import ReportsExportCenter from './reports/ReportsExportCenter';

type Tab = 'dashboard' | 'health-summary' | 'activity' | 'nutrition' | 'behavior' | 'sleep' | 'vaccination' | 'veterinary' | 'vet-notes' | 'timeline' | 'risk' | 'export';

const TABS: { id: Tab, label: string, icon: any }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: HeartPulse },
  { id: 'health-summary', label: 'Health Summary', icon: ShieldCheck },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'nutrition', label: 'Nutrition', icon: Utensils },
  { id: 'behavior', label: 'Behavior', icon: Brain },
  { id: 'sleep', label: 'Sleep', icon: Moon },
  { id: 'vaccination', label: 'Vaccinations', icon: ShieldCheck },
  { id: 'veterinary', label: 'Vet Visits', icon: Stethoscope },
  { id: 'vet-notes', label: 'Vet Notes', icon: BookOpen },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'risk', label: 'AI Risk', icon: AlertTriangle },
  { id: 'export', label: 'Export', icon: Download },
];

export default function Reports() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { selectedDog, vaccineRecords, dewormingRecords, symptomLogs, vetVisits } = usePawphileData();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);

  // Generate simulation data only once per dog change
  const simulatedData = useMemo(() => {
    if (!selectedDog) return [];
    return generateSimulatedData(selectedDog, 90);
  }, [selectedDog]);

  // Existing report data for backward compatibility in exports
  const reportData = useMemo(() => {
    if (!selectedDog) return null;
    const vaccines = vaccineRecords.filter(v => v.dogId === selectedDog.id).sort((a, b) => b.dateGiven.localeCompare(a.dateGiven));
    const deworming = dewormingRecords.filter(d => d.dogId === selectedDog.id).sort((a, b) => b.dateGiven.localeCompare(a.dateGiven));
    const recentSymptoms = symptomLogs.filter(s => s.dogId === selectedDog.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const recentVisits = vetVisits.filter(v => v.dogId === selectedDog.id).sort((a, b) => b.visitDate.localeCompare(a.visitDate));
    return { vaccines, deworming, recentSymptoms, recentVisits };
  }, [selectedDog, vaccineRecords, dewormingRecords, symptomLogs, vetVisits]);

  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    try {
      if (!user || !selectedDog) throw new Error("Missing user or dog context.");
      const reportPayload = {
        user_id: user.id,
        dog_id: selectedDog.id,
        report_data: {
          dog: { name: selectedDog.name, breed: selectedDog.breed, age: selectedDog.age, weight: selectedDog.weight, sex: selectedDog.sex, neutered: selectedDog.neutered },
          triage_sessions: reportData?.recentSymptoms?.map(s => ({ date: new Date(s.createdAt).toLocaleDateString(), severity: s.energyLevel, symptoms: s.mainConcern })) || []
        }
      };
      const res = await generatePdfReport(reportPayload);
      if (res && res.signed_url) window.open(res.signed_url, '_blank');
      else throw new Error("No download URL returned from backend.");
    } catch (err: any) {
      console.error(err);
      alert(`Failed to generate PDF: ${err.message || 'Server error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToCloud = async () => {
    setIsSavingToCloud(true);
    try {
      if (!user || !selectedDog) throw new Error("Missing user or dog context.");
      const token = await getToken();
      if (!token) throw new Error("Missing auth token.");
      const reportPayload = {
        user_id: user.id,
        dog_id: selectedDog.id,
        report_data: {
          dog: { name: selectedDog.name, breed: selectedDog.breed, age: selectedDog.age, weight: selectedDog.weight, sex: selectedDog.sex, neutered: selectedDog.neutered },
          triage_sessions: reportData?.recentSymptoms?.map(s => ({ date: new Date(s.createdAt).toLocaleDateString(), severity: s.energyLevel, symptoms: s.mainConcern })) || []
        }
      };
      const res = await generatePdfReport(reportPayload);
      if (res && res.signed_url) {
        const pdfRes = await fetch(res.signed_url);
        const blob = await pdfRes.blob();
        const file = new File([blob], `Health_Report_${selectedDog.name}_${Date.now()}.pdf`, { type: 'application/pdf' });
        const uploadResult = await uploadPdfReportToStorage(token, user.id, selectedDog.id, file);
        if (uploadResult) {
          await saveReportMetadata(token, { dog_id: selectedDog.id, profile_id: user.id, report_type: 'Health Summary', file_path: uploadResult.path, file_size: file.size, included_sections: ['overview'] });
          alert("Report successfully saved to cloud!");
        } else throw new Error("Upload failed.");
      } else throw new Error("No download URL returned from backend.");
    } catch (err: any) {
      console.error(err);
      alert(`Failed to save to cloud: ${err.message || 'Server error'}`);
    } finally {
      setIsSavingToCloud(false);
    }
  };

  const handleExportCsv = (type: 'symptoms' | 'vaccines' | 'deworming' | 'visits') => {
    if (!reportData || !selectedDog) return;
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = '';

    if (type === 'symptoms') {
      headers = ['Date', 'Main Concern', 'Energy Level', 'Appetite Status', 'Gum Color', 'Breathing Status'];
      rows = reportData.recentSymptoms.map(s => [new Date(s.createdAt).toLocaleDateString(), s.mainConcern, s.energyLevel, s.appetiteStatus, s.gumColor || '', s.breathingStatus || '']);
      filename = `symptom_logs_${selectedDog.name}.csv`;
    } else if (type === 'vaccines') {
      headers = ['Vaccine Name', 'Date Given', 'Next Due Date', 'Clinic/Vet'];
      rows = reportData.vaccines.map(v => [v.vaccineName, new Date(v.dateGiven).toLocaleDateString(), v.nextDueDate ? new Date(v.nextDueDate).toLocaleDateString() : '', v.clinicName || v.vetName || '']);
      filename = `vaccine_records_${selectedDog.name}.csv`;
    } else if (type === 'deworming') {
      headers = ['Product Name', 'Date Given', 'Next Due Date', 'Notes'];
      rows = reportData.deworming.map(d => [d.productName || 'Dewormer', new Date(d.dateGiven).toLocaleDateString(), d.nextDueDate ? new Date(d.nextDueDate).toLocaleDateString() : '', d.vetNotes || '']);
      filename = `deworming_records_${selectedDog.name}.csv`;
    } else if (type === 'visits') {
      headers = ['Date', 'Reason', 'Diagnosis', 'Prescription', 'Remarks'];
      rows = reportData.recentVisits.map(v => [new Date(v.visitDate).toLocaleDateString(), v.reasonForVisit, v.diagnosisAsEntered || '', v.medicinesPrescribed || '', v.vetRemarks || '']);
      filename = `vet_visits_${selectedDog.name}.csv`;
    }

    const csvContent = [headers.join(','), ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!selectedDog) {
    return (
      <PageWrapper className="bg-slate-50 flex items-center justify-center min-h-[80vh]">
        <p className="font-bold text-slate-500">Please add a dog profile to generate reports.</p>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-20">
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-4 flex items-center justify-between print:hidden">
        <span className="font-black text-lg tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
          PAWPHILE <span className="text-teal-600">Intelligence</span>
        </span>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row min-h-screen relative">
        
        {/* Sidebar Navigation */}
        <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:block ${isMobileMenuOpen ? 'translate-x-0 mt-[64px]' : '-translate-x-full'} print:hidden`}>
          <div className="p-6 h-full overflow-y-auto">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-3 lg:mt-0">Report Modules</h3>
            <div className="space-y-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                    activeTab === tab.id 
                      ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-teal-600 dark:text-teal-500' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-4 lg:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 w-full">
          <div className="max-w-6xl mx-auto w-full overflow-hidden">
            {activeTab === 'dashboard' && <ReportsDashboard dog={selectedDog} simulatedData={simulatedData} />}
            {activeTab === 'health-summary' && <HealthSummaryReport dog={selectedDog} simulatedData={simulatedData} />}
            {activeTab === 'activity' && <ActivityReport dog={selectedDog} simulatedData={simulatedData} />}
            {activeTab === 'nutrition' && <NutritionFoodReport dog={selectedDog} simulatedData={simulatedData} />}
            {activeTab === 'behavior' && <BehaviorAnalyticsReport dog={selectedDog} simulatedData={simulatedData} />}
            {activeTab === 'sleep' && <SleepAnalyticsReport dog={selectedDog} simulatedData={simulatedData} />}
            {activeTab === 'vaccination' && <VaccinationReport vaccines={reportData?.vaccines || []} />}
            {activeTab === 'veterinary' && <VeterinaryReport vetVisits={reportData?.recentVisits || []} />}
            {activeTab === 'vet-notes' && <VetNotesReport vetVisits={reportData?.recentVisits || []} />}
            {activeTab === 'timeline' && <HealthTimelineReport dog={selectedDog} vetVisits={reportData?.recentVisits || []} vaccines={reportData?.vaccines || []} symptoms={reportData?.recentSymptoms || []} />}
            {activeTab === 'risk' && <AiRiskReport dog={selectedDog} symptoms={reportData?.recentSymptoms || []} simulatedData={simulatedData} />}
            {activeTab === 'export' && (
              <ReportsExportCenter 
                dog={selectedDog} 
                onGeneratePdf={handleGeneratePdf} 
                isGeneratingPdf={isGenerating} 
                onSaveToCloud={handleSaveToCloud} 
                isSavingToCloud={isSavingToCloud} 
                onExportCsv={handleExportCsv} 
              />
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
