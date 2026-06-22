import { useMemo, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import {
  Printer, ShieldCheck, Activity, Calendar, ShieldAlert,
  AlertTriangle, CheckCircle, Clock, FileText, Cloud, Download
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import { usePawphileData } from '../context/PawphileDataContext';
import {
  getEmergencyEventsForDog,
  getEmergencyReportStats,
  updateEmergencyEventStatus,
  type EmergencyEvent,
  type EmergencyStatus,
} from '../services/emergencyEventsService';

import { generatePdfReport } from '../services/apiClient';
import { uploadPdfReportToStorage, saveReportMetadata } from '../services/reportService';
import { calculateBCS, calculateMER } from '../utils/bcsUtils';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

type ReportView = 'overview' | 'emergency';
type EmergencyFilter = 'all' | 'red' | 'orange' | 'manual' | 'active' | 'resolved';

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<any> }> = {
  red_emergency:   { label: 'Red Emergency',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: ShieldAlert },
  orange_urgent:   { label: 'Orange Urgent',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: AlertTriangle },
  green_monitor:   { label: 'Green Monitor',   color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle },
  manual_emergency:{ label: 'Manual Emergency',color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', icon: ShieldAlert },
};

export default function Reports() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { selectedDog, vaccineRecords, dewormingRecords, symptomLogs, vetVisits } = usePawphileData();
  const [view, setView] = useState<ReportView>('overview');
  const [emergencyFilter, setEmergencyFilter] = useState<EmergencyFilter>('all');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);

  const handleGeneratePdf = async () => {
    if (view !== 'overview') {
      alert("Please switch to Health Summary view to generate PDF.");
      return;
    }

    setIsGenerating(true);
    console.log('[Analytics] report_generate_started');
    try {
      if (!user || !selectedDog) {
        throw new Error("Missing user or dog context.");
      }

      // Prepare structured JSON payload for backend
      const reportPayload = {
        user_id: user.id,
        dog_id: selectedDog.id,
        report_data: {
          dog: {
            name: selectedDog.name,
            breed: selectedDog.breed,
            age: selectedDog.age,
            weight: selectedDog.weight,
            sex: selectedDog.sex,
            neutered: selectedDog.neutered
          },
          triage_sessions: reportData?.recentSymptoms?.map(s => ({
            date: new Date(s.createdAt).toLocaleDateString(),
            severity: s.energyLevel, // approximation for now
            symptoms: s.mainConcern
          })) || []
        }
      };

      const res = await generatePdfReport(reportPayload);
      
      if (res && res.signed_url) {
        console.log('[Analytics] report_generate_success:', res.signed_url);
        window.open(res.signed_url, '_blank');
      } else {
        throw new Error("No download URL returned from backend.");
      }
    } catch (err: any) {
      console.error("Error generating PDF via backend:", err);
      console.log('[Analytics] report_generate_failed');
      alert(`Failed to generate PDF: ${err.message || 'Server error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToCloud = async () => {
    if (view !== 'overview') {
      alert("Please switch to Health Summary view to save PDF.");
      return;
    }

    setIsSavingToCloud(true);
    console.log('[Analytics] report_save_cloud_started');
    try {
      if (!user || !selectedDog) throw new Error("Missing user or dog context.");
      const token = await getToken();
      if (!token) throw new Error("Missing auth token.");

      const reportPayload = {
        user_id: user.id,
        dog_id: selectedDog.id,
        report_data: {
          dog: {
            name: selectedDog.name,
            breed: selectedDog.breed,
            age: selectedDog.age,
            weight: selectedDog.weight,
            sex: selectedDog.sex,
            neutered: selectedDog.neutered
          },
          triage_sessions: reportData?.recentSymptoms?.map(s => ({
            date: new Date(s.createdAt).toLocaleDateString(),
            severity: s.energyLevel,
            symptoms: s.mainConcern
          })) || []
        }
      };

      const res = await generatePdfReport(reportPayload);
      
      if (res && res.signed_url) {
        const pdfRes = await fetch(res.signed_url);
        if (!pdfRes.ok) throw new Error("Failed to fetch generated PDF blob.");
        const blob = await pdfRes.blob();
        const file = new File([blob], `Health_Report_${selectedDog.name}_${Date.now()}.pdf`, { type: 'application/pdf' });
        
        const uploadResult = await uploadPdfReportToStorage(token, user.id, selectedDog.id, file);
        if (uploadResult) {
          await saveReportMetadata(token, {
             dog_id: selectedDog.id,
             profile_id: user.id,
             report_type: 'Health Summary',
             file_path: uploadResult.path,
             file_size: file.size,
             included_sections: ['overview']
          });
          alert("Report successfully saved to cloud!");
        } else {
          throw new Error("Upload failed.");
        }
      } else {
        throw new Error("No download URL returned from backend.");
      }
    } catch (err: any) {
      console.error("Error saving PDF to cloud:", err);
      alert(`Failed to save to cloud: ${err.message || 'Server error'}`);
    } finally {
      setIsSavingToCloud(false);
    }
  };

  const reportData = useMemo(() => {
    if (!selectedDog) return null;
    const vaccines = vaccineRecords.filter(v => v.dogId === selectedDog.id)
      .sort((a, b) => b.dateGiven.localeCompare(a.dateGiven));
    const deworming = dewormingRecords.filter(d => d.dogId === selectedDog.id)
      .sort((a, b) => b.dateGiven.localeCompare(a.dateGiven));
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSymptoms = symptomLogs
      .filter(s => s.dogId === selectedDog.id && new Date(s.createdAt) >= thirtyDaysAgo)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const recentVisits = vetVisits
      .filter(v => v.dogId === selectedDog.id && new Date(v.visitDate) >= thirtyDaysAgo)
      .sort((a, b) => b.visitDate.localeCompare(a.visitDate));
    
    // Vision and Nutrition
    let visionScans: any[] = [];
    try {
      const allScans = JSON.parse(localStorage.getItem('pawphile_vision_scans') || '[]');
      visionScans = allScans.filter((s: any) => s.dogId === selectedDog.id).slice(0, 5);
    } catch (e) { /* ignore */ }
    
    let nutritionLogs: any[] = [];
    try {
      const allLogs = JSON.parse(localStorage.getItem('pawphile_nutrition_logs') || '[]');
      nutritionLogs = allLogs.filter((l: any) => l.dogId === selectedDog.id && new Date(l.createdAt) >= thirtyDaysAgo).slice(0, 5);
    } catch (e) { /* ignore */ }

    return { vaccines, deworming, recentSymptoms, recentVisits, visionScans, nutritionLogs };
  }, [selectedDog, vaccineRecords, dewormingRecords, symptomLogs, vetVisits]);

  const emergencyStats = useMemo(() => {
    if (!selectedDog) return null;
    return getEmergencyReportStats(selectedDog.id);
  }, [selectedDog]);

  const handleExportCsv = (type: 'symptoms' | 'vaccines' | 'deworming' | 'visits') => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = '';

    if (type === 'symptoms') {
      headers = ['Date', 'Main Concern', 'Energy Level', 'Appetite Status', 'Gum Color', 'Breathing Status'];
      rows = recentSymptoms.map(s => [
        new Date(s.createdAt).toLocaleDateString(),
        s.mainConcern,
        s.energyLevel,
        s.appetiteStatus,
        s.gumColor || '',
        s.breathingStatus || ''
      ]);
      filename = `symptom_logs_${selectedDog.name}.csv`;
    } else if (type === 'vaccines') {
      headers = ['Vaccine Name', 'Date Given', 'Next Due Date', 'Clinic/Vet'];
      rows = vaccines.map(v => [
        v.vaccineName,
        new Date(v.dateGiven).toLocaleDateString(),
        v.nextDueDate ? new Date(v.nextDueDate).toLocaleDateString() : '',
        v.clinicName || v.vetName || ''
      ]);
      filename = `vaccine_records_${selectedDog.name}.csv`;
    } else if (type === 'deworming') {
      headers = ['Product Name', 'Date Given', 'Next Due Date', 'Notes'];
      rows = deworming.map(d => [
        d.productName || 'Dewormer',
        new Date(d.dateGiven).toLocaleDateString(),
        d.nextDueDate ? new Date(d.nextDueDate).toLocaleDateString() : '',
        d.vetNotes || ''
      ]);
      filename = `deworming_records_${selectedDog.name}.csv`;
    } else if (type === 'visits') {
      headers = ['Date', 'Reason', 'Diagnosis', 'Prescription', 'Remarks'];
      rows = recentVisits.map(v => [
        new Date(v.visitDate).toLocaleDateString(),
        v.reasonForVisit,
        v.diagnosisAsEntered || '',
        v.medicinesPrescribed || '',
        v.vetRemarks || ''
      ]);
      filename = `vet_visits_${selectedDog.name}.csv`;
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const actionableInsights = useMemo(() => {
    if (!selectedDog) return [];
    const insights: string[] = [];

    // 1. Appetite check (consecutive days of low appetite)
    if (recentSymptoms && recentSymptoms.length >= 2) {
      const sortedSymptoms = [...recentSymptoms].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      let consecutiveLowAppetite = 0;
      let maxConsecutive = 0;
      for (const log of sortedSymptoms) {
        if (log.appetiteStatus === 'reduced' || log.appetiteStatus === 'refused') {
          consecutiveLowAppetite++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveLowAppetite);
        } else {
          consecutiveLowAppetite = 0;
        }
      }
      if (maxConsecutive >= 2) {
        insights.push(`⚠️ appetite: ${selectedDog.name} has had reduced/refused appetite for ${maxConsecutive} consecutive logged entries. Monitor for vomiting or lethargy.`);
      }
    }

    // 2. Weight fluctuation check (> 5% change in recent logs)
    try {
      const logs = JSON.parse(localStorage.getItem('pawphile_bmi_bcs_logs') || '[]');
      const dogLogs = logs.filter((log: any) => log.weightKg).sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
      if (dogLogs.length >= 2) {
        const latestWeight = dogLogs[0].weightKg;
        const prevWeight = dogLogs[1].weightKg;
        const percentChange = Math.abs(latestWeight - prevWeight) / prevWeight;
        if (percentChange >= 0.05) {
          insights.push(`⚖️ weight: Weight fluctuation detected! Weight changed by ${(percentChange * 100).toFixed(1)}% (from ${prevWeight}kg to ${latestWeight}kg) in recent logs.`);
        }
      }
    } catch (e) {}

    // 3. Calorie consumption vs recommendation
    const weight = Number(selectedDog.weight || (selectedDog as any).weightKg || 0);
    if (weight > 0) {
      const merTarget = calculateMER(selectedDog);
      if (nutritionLogs && nutritionLogs.length > 0) {
        const totalCalories = nutritionLogs.reduce((sum, log) => sum + (log.calories || 0), 0);
        const avgCalories = totalCalories / nutritionLogs.length;
        if (avgCalories > merTarget * 1.15) {
          insights.push(`⚖️ nutrition: Average calorie intake (${Math.round(avgCalories)} kcal) is more than 15% above the recommended MER target of ${Math.round(merTarget)} kcal. Risk of weight gain.`);
        } else if (avgCalories < merTarget * 0.85) {
          insights.push(`📉 nutrition: Average calorie intake (${Math.round(avgCalories)} kcal) is more than 15% below the recommended MER target of ${Math.round(merTarget)} kcal.`);
        }
      }
    }

    if (insights.length === 0) {
      insights.push(`✅ Health Metrics Stable: No immediate clinical concerns flagged based on the last 30 days of health logs.`);
    }

    return insights;
  }, [selectedDog, recentSymptoms, recentVisits, nutritionLogs]);

  const nutritionChartData = useMemo(() => {
    const target = calculateMER(selectedDog);
    const sortedLogs = [...nutritionLogs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return sortedLogs.map(log => ({
      date: new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      consumed: log.calories || 0,
      target
    }));
  }, [nutritionLogs, selectedDog]);

  const healthChartData = useMemo(() => {
    const sortedLogs = [...recentSymptoms].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return sortedLogs.map(log => {
      let energyScore = 3;
      if (log.energyLevel === 'normal') energyScore = 5;
      else if (log.energyLevel === 'quiet') energyScore = 4;
      else if (log.energyLevel === 'lethargic') energyScore = 3;
      else if (log.energyLevel === 'weak') energyScore = 2;
      else if (log.energyLevel === 'collapsed') energyScore = 1;
      
      return {
        date: new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        energy: energyScore
      };
    });
  }, [recentSymptoms]);

  const weightChartData = useMemo(() => {
    try {
      const logs = JSON.parse(localStorage.getItem('pawphile_bmi_bcs_logs') || '[]');
      const dogLogs = logs.sort((a: any, b: any) => a.createdAt.localeCompare(b.createdAt));
      return dogLogs.map((log: any) => ({
        date: new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        weight: log.weightKg
      }));
    } catch (e) {
      return [];
    }
  }, [selectedDog]);

  const emergencyEvents = useMemo(() => {
    if (!selectedDog) return [];
    return getEmergencyEventsForDog(selectedDog.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [selectedDog]);

  const filteredEvents = useMemo(() => {
    return emergencyEvents.filter(e => {
      if (emergencyFilter === 'all') return true;
      if (emergencyFilter === 'red') return e.severity === 'red_emergency';
      if (emergencyFilter === 'orange') return e.severity === 'orange_urgent';
      if (emergencyFilter === 'manual') return e.severity === 'manual_emergency';
      if (emergencyFilter === 'active') return e.status === 'active';
      if (emergencyFilter === 'resolved') return e.status !== 'active';
      return true;
    });
  }, [emergencyEvents, emergencyFilter]);

  const handleStatusChange = (id: string, status: EmergencyStatus) => {
    updateEmergencyEventStatus(id, status);
  };

  if (!selectedDog || !reportData) {
    return (
      <PageWrapper className="bg-slate-50 flex items-center justify-center min-h-[80vh]">
        <p className="font-bold text-slate-500">Please add a dog profile to generate a report.</p>
      </PageWrapper>
    );
  }

  const { vaccines, deworming, recentSymptoms, recentVisits, visionScans, nutritionLogs } = reportData;

  return (
    <PageWrapper className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-20">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 flex items-center justify-between print:hidden">
        <span className="font-black text-lg tracking-wide text-slate-900 dark:text-white">Health Reports</span>
        <div className="flex items-center gap-2">
          <button onClick={handleGeneratePdf} disabled={isGenerating || isSavingToCloud}
            className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
            <Download className="w-4 h-4" /> {isGenerating ? '...' : 'Download PDF'}
          </button>
          <button onClick={handleSaveToCloud} disabled={isGenerating || isSavingToCloud}
            className="bg-teal-600 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-teal-700 transition-colors disabled:opacity-50">
            <Cloud className="w-4 h-4" /> {isSavingToCloud ? 'Saving...' : 'Save to Cloud'}
          </button>
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleExportCsv(e.target.value as any);
                e.target.value = '';
              }
            }}
            className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 font-bold px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs outline-none cursor-pointer"
          >
            <option value="">Export CSV</option>
            <option value="symptoms">Symptoms CSV</option>
            <option value="vaccines">Vaccines CSV</option>
            <option value="deworming">Deworming CSV</option>
            <option value="visits">Vet Visits CSV</option>
          </select>
        </div>
      </div>

      {/* ── Report Type Tabs ──────────────────────────────────── */}
      <div className="px-4 py-3 print:hidden">
        <div className="flex gap-2">
          <button
            onClick={() => setView('overview')}
            className={`flex-1 py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
              view === 'overview' ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}>
            <FileText className="w-4 h-4" /> Health Summary
          </button>
          <button
            onClick={() => setView('emergency')}
            className={`flex-1 py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all relative ${
              view === 'emergency' ? 'bg-red-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}>
            <ShieldAlert className="w-4 h-4" /> Emergency Report
            {emergencyStats && emergencyStats.total > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
                style={{ background: '#ef4444', color: '#fff' }}>
                {emergencyStats.total}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          HEALTH SUMMARY VIEW
      ═══════════════════════════════════════════════════ */}
      {view === 'overview' && (
        <div id="pdf-report-content" className="max-w-2xl mx-auto p-8 bg-white text-black min-h-[1056px] shadow-sm print:shadow-none print:p-0 my-4 print:my-0">
          {/* Report Header */}
          <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tight">Health Summary</h1>
              <p className="text-sm font-bold text-slate-500 mt-1">Generated: {new Date().toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="font-black text-xl tracking-widest text-teal-700">PAWPHILE</p>
              <p className="text-xs font-semibold text-slate-400">For who you Love.</p>
            </div>
          </div>

          {/* Summary Statistics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 rounded-2xl p-4 text-center">
              <p className="text-3xl font-black text-rose-600">{recentSymptoms.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mt-1">Symptom Logs</p>
              <p className="text-[9px] text-rose-400 mt-0.5">Last 30 days</p>
            </div>
            <div className="bg-gradient-to-br from-sky-50 to-sky-100 border border-sky-200 rounded-2xl p-4 text-center">
              <p className="text-3xl font-black text-sky-600">{recentVisits.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-500 mt-1">Vet Visits</p>
              <p className="text-[9px] text-sky-400 mt-0.5">Last 30 days</p>
            </div>
            <div className="bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200 rounded-2xl p-4 text-center">
              <p className="text-3xl font-black text-violet-600">{visionScans.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 mt-1">Vision Scans</p>
              <p className="text-[9px] text-violet-400 mt-0.5">Total logged</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-2xl p-4 text-center">
              <p className="text-3xl font-black text-amber-600">{nutritionLogs.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mt-1">Nutrition Days</p>
              <p className="text-[9px] text-amber-400 mt-0.5">Last 30 days</p>
            </div>
          </div>

          {/* Profile Summary */}
          <div className="mb-8">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Profile Summary
            </h2>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div><p className="text-[10px] uppercase font-bold text-slate-500">Name</p><p className="font-black text-lg">{selectedDog.name}</p></div>
              <div><p className="text-[10px] uppercase font-bold text-slate-500">Breed</p><p className="font-black text-lg">{selectedDog.breed}</p></div>
              <div><p className="text-[10px] uppercase font-bold text-slate-500">Age / Sex</p><p className="font-bold">{selectedDog.age || '?'} yrs • {selectedDog.sex}</p></div>
              <div><p className="text-[10px] uppercase font-bold text-slate-500">Weight</p><p className="font-bold">{selectedDog.weight ? `${selectedDog.weight} ${selectedDog.weightUnit}` : 'N/A'}</p></div>
              <div className="col-span-2">
                <p className="text-[10px] uppercase font-bold text-slate-500">Chronic Conditions</p>
                <p className="font-bold text-red-700">{selectedDog.chronicConditions?.join(', ') || 'None reported'}</p>
              </div>
            </div>
          </div>

          {/* Actionable Insights */}
          <div className="mb-8 print:hidden">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-teal-600 animate-pulse" /> Actionable Insights
            </h2>
            <div className="bg-teal-50/50 border border-teal-200/60 rounded-2xl p-5 space-y-3">
              {actionableInsights.map((insight, idx) => (
                <div key={idx} className="flex gap-2 text-sm text-slate-800 font-medium">
                  <span className="shrink-0">{insight.split(': ')[0]}</span>
                  <span>{insight.split(': ').slice(1).join(': ')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trend Charts */}
          <div className="mb-8 print:hidden">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Health & Calorie Trends
            </h2>
            <div className="space-y-6">
              {/* Calorie consumption chart */}
              {nutritionChartData.length > 0 && (
                <div className="border border-slate-200 p-4 rounded-xl bg-white">
                  <p className="text-xs font-bold text-slate-500 mb-2">Daily Calorie Consumption vs Target (kcal)</p>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={nutritionChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="consumed" fill="#0d9488" name="Consumed" />
                        <Bar dataKey="target" fill="#f97316" name="Target MER" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Weight changes chart */}
              {weightChartData.length > 0 && (
                <div className="border border-slate-200 p-4 rounded-xl bg-white">
                  <p className="text-xs font-bold text-slate-500 mb-2">Weight History (kg)</p>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weightChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={['auto', 'auto']} />
                        <Tooltip />
                        <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2} name="Weight" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Energy Level score over time */}
              {healthChartData.length > 0 && (
                <div className="border border-slate-200 p-4 rounded-xl bg-white">
                  <p className="text-xs font-bold text-slate-500 mb-2">Energy Score Trend (1-5)</p>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={healthChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="energy" stroke="#10b981" strokeWidth={2} name="Energy Score" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preventive Care */}
          <div className="mb-8">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Preventive Care Status
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="border border-slate-200 p-4 rounded-xl">
                <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Latest Vaccines</p>
                {vaccines.length > 0 ? (
                  <ul className="space-y-2">
                    {vaccines.slice(0, 3).map(v => (
                      <li key={v.id} className="flex justify-between items-center text-sm">
                        <span className="font-bold">{v.vaccineName}</span>
                        <span className="text-slate-500">{new Date(v.dateGiven).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm italic text-slate-500">No vaccines logged.</p>}
              </div>
              <div className="border border-slate-200 p-4 rounded-xl">
                <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Latest Deworming</p>
                {deworming.length > 0 ? (
                  <ul className="space-y-2">
                    {deworming.slice(0, 3).map(d => (
                      <li key={d.id} className="flex justify-between items-center text-sm">
                        <span className="font-bold">{d.productName || 'Deworming'}</span>
                        <span className="text-slate-500">{new Date(d.dateGiven).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm italic text-slate-500">No deworming logged.</p>}
              </div>
            </div>
          </div>

          {/* Recent Logs */}
          <div className="mb-8">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Recent Logs (Last 30 Days)
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-sm mb-2 text-slate-600">Symptom Checks</h3>
                {recentSymptoms.length > 0 ? (
                  <div className="space-y-2">
                    {recentSymptoms.map(s => (
                      <div key={s.id} className="flex justify-between border-b border-slate-100 pb-2">
                        <div>
                          <p className="font-bold text-sm">{s.mainConcern}</p>
                          <p className="text-xs text-slate-500">Energy: {s.energyLevel} • Appetite: {s.appetiteStatus}</p>
                        </div>
                        <span className="text-xs font-bold text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm italic text-slate-500">No symptom checks in the last 30 days.</p>}
              </div>
              <div>
                <h3 className="font-bold text-sm mb-2 text-slate-600">Vet Visits</h3>
                {recentVisits.length > 0 ? (
                  <div className="space-y-2">
                    {recentVisits.map(v => (
                      <div key={v.id} className="border border-slate-200 p-3 rounded-xl">
                        <div className="flex justify-between mb-1">
                          <p className="font-bold text-sm">{v.reasonForVisit}</p>
                          <span className="text-xs font-bold text-slate-500">
                            <Calendar className="w-3 h-3 inline mr-1" />{new Date(v.visitDate).toLocaleDateString()}
                          </span>
                        </div>
                        {v.diagnosisAsEntered && <p className="text-xs"><span className="font-bold text-slate-500">Diagnosis:</span> {v.diagnosisAsEntered}</p>}
                        {v.medicinesPrescribed && <p className="text-xs"><span className="font-bold text-slate-500">Prescribed:</span> {v.medicinesPrescribed}</p>}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm italic text-slate-500">No vet visits in the last 30 days.</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-6 mt-4">
                <div>
                  <h3 className="font-bold text-sm mb-2 text-slate-600">Vision Scans</h3>
                  {visionScans.length > 0 ? (
                    <div className="space-y-2">
                      {visionScans.map((s: any) => (
                        <div key={s.id} className="border border-slate-200 p-3 rounded-xl">
                          <div className="flex justify-between mb-1">
                            <p className="font-bold text-sm capitalize">{s.concernType || s.areaId}</p>
                            <span className="text-[10px] font-bold text-slate-500">
                              {new Date(s.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs">
                            <span className="font-bold text-slate-500">Result:</span> {s.result?.signalTitle || s.severity}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm italic text-slate-500">No vision scans logged.</p>}
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-2 text-slate-600">Recent Nutrition</h3>
                  {nutritionLogs.length > 0 ? (
                    <div className="space-y-2">
                      {nutritionLogs.map((l: any) => (
                        <div key={l.id} className="border border-slate-200 p-3 rounded-xl">
                          <div className="flex justify-between mb-1">
                            <p className="font-bold text-sm">{l.foodName}</p>
                            <span className="text-[10px] font-bold text-slate-500">
                              {new Date(l.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs">
                            <span className="font-bold text-slate-500">Calories:</span> {l.caloriesCal} Cal {l.isTreat && '(Treat)'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm italic text-slate-500">No nutrition logs in the last 30 days.</p>}
                </div>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-4 border-t-2 border-slate-200 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Generated by PAWPHILE</p>
            <p className="text-[10px] text-slate-500 italic">This is an owner-reported summary, not a certified medical document.</p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          EMERGENCY REPORT VIEW
      ═══════════════════════════════════════════════════ */}
      {view === 'emergency' && (
        <div className="max-w-2xl mx-auto px-4 pb-10 space-y-5">

          {/* Disclaimer */}
          <div className="rounded-2xl px-4 py-3 mt-2"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-xs font-bold leading-relaxed" style={{ color: '#f87171' }}>
              This report is for emergency history and vet communication. It is not a medical diagnosis.
            </p>
          </div>

          {/* Stats Cards */}
          {emergencyStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total" value={emergencyStats.total} color="#ef4444" />
              <StatCard label="🔴 Red" value={emergencyStats.redCount} color="#ef4444" />
              <StatCard label="🟠 Orange" value={emergencyStats.orangeCount} color="#f59e0b" />
              <StatCard label="Manual" value={emergencyStats.manualCount} color="#8b5cf6" />
            </div>
          )}
          {emergencyStats?.latestDate && (
            <p className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
              Latest emergency: {new Date(emergencyStats.latestDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              {emergencyStats.mostCommonType ? ` · Most common: ${emergencyStats.mostCommonType}` : ''}
            </p>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'red', 'orange', 'manual', 'active', 'resolved'] as EmergencyFilter[]).map(f => (
              <button key={f} onClick={() => setEmergencyFilter(f)}
                className="px-3 py-1 rounded-full text-xs font-black transition-all capitalize"
                style={{
                  background: emergencyFilter === f ? 'var(--teal)' : 'var(--card)',
                  color: emergencyFilter === f ? '#fff' : 'var(--text-2)',
                  border: '1px solid var(--border-2)',
                }}>
                {f}
              </button>
            ))}
          </div>

          {/* Timeline */}
          {filteredEvents.length === 0 ? (
            <div className="pw-card p-10 flex flex-col items-center gap-3 text-center"
              style={{ border: '1px dashed var(--border-2)' }}>
              <ShieldAlert className="w-10 h-10" style={{ color: 'var(--text-3)' }} />
              <p className="font-black text-sm" style={{ color: 'var(--text-2)' }}>No emergency records found</p>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
                Emergency records are created after completing a Triage Assessment.
              </p>
            </div>
          ) : filteredEvents.map(event => (
            <EmergencyEventCard key={event.id} event={event} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}

function EmergencyEventCard({
  event, onStatusChange,
}: {
  event: EmergencyEvent;
  onStatusChange: (id: string, status: EmergencyStatus) => void;
}) {
  const cfg = SEVERITY_CONFIG[event.severity] || SEVERITY_CONFIG.manual_emergency;
  const Icon = cfg.icon;

  return (
    <div className="pw-card overflow-hidden">
      {/* Color header */}
      <div className="px-4 py-3 flex items-center justify-between"
        style={{ background: cfg.bg, borderBottom: `1px solid ${cfg.color}30` }}>
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" style={{ color: cfg.color }} />
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>
            {event.status}
          </span>
          {event.status === 'active' && (
            <select
              value={event.status}
              onChange={e => onStatusChange(event.id, e.target.value as EmergencyStatus)}
              className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
              style={{ background: 'var(--card-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
            >
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
              <option value="vet_visited">Vet Visited</option>
              <option value="false_alarm">False Alarm</option>
            </select>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Date & Type */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
              {new Date(event.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {event.confidence_score && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ background: 'var(--card-2)', color: 'var(--text-2)' }}>
              {event.confidence_score}% confidence
            </span>
          )}
        </div>

        {/* Emergency type */}
        {event.emergency_type && (
          <p className="font-black text-sm" style={{ color: 'var(--text)' }}>{event.emergency_type}</p>
        )}

        {/* Symptoms */}
        {event.symptoms?.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-3)' }}>Symptoms</p>
            <div className="flex flex-wrap gap-1.5">
              {event.symptoms.slice(0, 5).map((s: any, i) => (
                <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--card-2)', color: 'var(--text-2)' }}>
                  {typeof s === 'string' ? s : JSON.stringify(s)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recommendation */}
        {event.recommended_action && (
          <div className="rounded-xl px-3 py-2"
            style={{ background: 'var(--teal-dim)', border: '1px solid var(--teal-glow)' }}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'var(--teal)' }}>Recommendation</p>
            <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{event.recommended_action}</p>
          </div>
        )}

        {/* Owner notes */}
        {event.owner_notes && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>Owner Notes</p>
            <p className="text-xs font-semibold italic" style={{ color: 'var(--text-2)' }}>"{event.owner_notes}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="pw-card p-3 text-center">
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
      <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--text-3)' }}>{label}</p>
    </div>
  );
}
