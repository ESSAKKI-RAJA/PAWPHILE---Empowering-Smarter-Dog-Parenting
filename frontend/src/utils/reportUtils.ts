import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { OwnerProfile } from '../types/pawphile';
import type { VaccineSchedule, DogProfile } from '../types';
import { calculateBCS, calculateMER } from './bcsUtils';

export function formatDateIndia(iso: string | null | undefined): string {
  if (!iso) return 'N/A';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function calcAge(dob: string | null | undefined): string {
  if (!dob) return 'Unknown';
  const now = new Date();
  const birth = new Date(dob);
  const diffMs = now.getTime() - birth.getTime();
  const years = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
  const months = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
  if (years > 0) return `${years} yr${years > 1 ? 's' : ''} ${months > 0 ? `${months} mo` : ''}`.trim();
  return `${months} month${months !== 1 ? 's' : ''}`;
}

interface ReportInput {
  profile: DogProfile;
  owner: OwnerProfile;
  vaccines: VaccineSchedule[];
}

export async function generateFullHealthReport(input: ReportInput): Promise<void> {
  const { profile, owner, vaccines } = input;
  const doc = new jsPDF();
  const PAGE_W = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(20, 184, 166);
  doc.rect(0, 0, PAGE_W, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('PAWPHILE Veterinary Report', 14, 20);
  
  let yPos = 40;
  
  // Dog details
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.text('Dog Profile', 14, yPos);
  
  const bcs = calculateBCS(profile);
  const mer = calculateMER(profile);

  autoTable(doc, {
    startY: yPos + 5,
    head: [['Attribute', 'Details']],
    body: [
      ['Name', profile.name || 'N/A'],
      ['Breed', profile.breed || 'N/A'],
      ['Age', calcAge(profile.dateOfBirth)],
      ['Weight', `${profile.weightKg || 'N/A'} kg`],
      ['Gender', profile.gender || 'N/A'],
      ['Diet Type', profile.dietType || 'N/A'],
      ['Estimated BCS', `${bcs.score}/9 (${bcs.label})`],
      ['Daily MER Target', `${mer} kcal`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [20, 184, 166] }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Owner details
  doc.setFontSize(16);
  doc.text('Owner Information', 14, yPos);
  
  autoTable(doc, {
    startY: yPos + 5,
    head: [['Attribute', 'Details']],
    body: [
      ['Owner Name', owner.name || 'N/A'],
      ['Phone', owner.phone || 'N/A'],
      ['Email', owner.email || 'N/A'],
      ['City / Country', `${owner.city || '—'}, ${owner.country || 'India'}`],
      ['Emergency Contact', `${owner.emergencyContactName || '—'} · ${owner.emergencyContactPhone || '—'}`],
      ['Preferred Vet', `${owner.preferredVetName || '—'} · ${owner.preferredVetPhone || '—'}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [20, 184, 166] }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Vaccines
  doc.setFontSize(16);
  doc.text('Vaccine History', 14, yPos);
  
  if (vaccines.length === 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.text('No vaccines recorded.', 14, yPos + 10);
    yPos += 20;
  } else {
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Vaccine', 'Due Date', 'Completed Date', 'Status']],
      body: vaccines.map(v => [
        v.vaccineName,
        formatDateIndia(v.dueDate),
        v.completedDate ? formatDateIndia(v.completedDate) : '—',
        v.status.toUpperCase()
      ]),
      theme: 'grid',
      headStyles: { fillColor: [20, 184, 166] }
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Triage History
  let triageHistory = [];
  try {
    const th = localStorage.getItem('pawphile_triage_history');
    if (th) triageHistory = JSON.parse(th);
  } catch { /* ignore parse error, return raw string */ }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Triage History', 14, yPos);
  
  if (triageHistory.length === 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.text('No triage history found.', 14, yPos + 10);
  } else {
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Date', 'Severity', 'Symptoms', 'Result']],
      body: triageHistory.slice(-5).reverse().map((t: any) => {
        const syms = [t.symptoms, ...(t.selectedSymptoms || [])].filter(Boolean).join(', ');
        return [
          formatDateIndia(t.timestamp),
          t.result?.severity?.toUpperCase() || 'UNKNOWN',
          syms || 'Not provided',
          t.result?.title || 'Unknown'
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: [20, 184, 166] }
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Reference Basis Section
  if (yPos > PAGE_W * 1.2) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Reference Basis', 14, yPos);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const references = [
    '• Nutrition / Estimated BCS: WSAVA, AAHA, MSD/Merck Veterinary Manual',
    '• Food Label / Food Safety: AAFCO, FEDIAF, FDA/openFDA',
    '• Triage / Emergency: MSD/Merck Veterinary Manual, AVMA, ASPCA, WSAVA',
    '• Vaccination / Prevention: AAHA, WSAVA',
    '• Breed Risk: OMIA, IPFD/DogWellNet, OFA/CHIC'
  ];
  yPos += 8;
  references.forEach(ref => {
    doc.text(ref, 14, yPos);
    yPos += 6;
  });

  // Medical Disclaimer
  yPos += 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const disclaimerText = 'Medical Disclaimer: PAWPHILE provides educational and preventive health support. It does not diagnose, treat, or replace a licensed veterinarian. Emergency signs require immediate veterinary care.';
  const lines = doc.splitTextToSize(disclaimerText, PAGE_W - 28);
  doc.text(lines, 14, yPos);

  doc.save(`PAWPHILE_HealthReport_${profile.name?.replace(/\s+/g, '_') ?? 'Dog'}_${new Date().toISOString().split('T')[0]}.pdf`);
}
