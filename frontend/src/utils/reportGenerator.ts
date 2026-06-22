import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateMER } from './bcsUtils';
import { formatDateIndia } from './reportUtils';

// Helper for boilerplate
function initDoc(title: string) {
  const doc = new jsPDF();
  const PAGE_W = doc.internal.pageSize.getWidth();
  
  doc.setFillColor(20, 184, 166); // Teal
  doc.rect(0, 0, PAGE_W, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(`PAWPHILE ${title}`, 14, 20);
  
  doc.setTextColor(0, 0, 0);
  return { doc, PAGE_W, yPos: 40 };
}

function addDisclaimer(doc: jsPDF, PAGE_W: number, startY: number) {
  let yPos = startY + 15;
  if (yPos > PAGE_W * 1.2) {
    doc.addPage();
    yPos = 20;
  }
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const disclaimerText = 'Medical Disclaimer: PAWPHILE provides educational and preventive health support. It does not diagnose, treat, or replace a licensed veterinarian. Emergency signs require immediate veterinary care.';
  const lines = doc.splitTextToSize(disclaimerText, PAGE_W - 28);
  doc.text(lines, 14, yPos);
}

export async function generateFullMedicalReport(data: any) {
  const { profile, owner } = data;
  const { doc, PAGE_W, yPos: startY } = initDoc('Medical Report');
  
  let yPos = startY;
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Dog Profile', 14, yPos);
  
  

  autoTable(doc, {
    startY: yPos + 5,
    head: [['Attribute', 'Details']],
    body: [
      ['Name', profile?.name || 'N/A'],
      ['Breed', profile?.breed || 'N/A'],
      ['Weight', `${profile?.weightKg || 'N/A'} kg`],
      ['Gender', profile?.gender || 'N/A'],
      ['Allergies', (profile?.allergies || []).join(', ') || 'None'],
      ['Existing Conditions', (profile?.existingConditions || []).join(', ') || 'None'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [20, 184, 166] }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  doc.text('Owner Information', 14, yPos);
  autoTable(doc, {
    startY: yPos + 5,
    head: [['Attribute', 'Details']],
    body: [
      ['Owner Name', owner?.fullName || owner?.name || 'N/A'],
      ['Phone', owner?.phone || 'N/A'],
      ['Emergency Contact', `${owner?.emergencyContactName || '—'} · ${owner?.emergencyContactPhone || '—'}`],
      ['Preferred Vet', `${owner?.preferredVetName || '—'} · ${owner?.preferredVetPhone || '—'}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [20, 184, 166] }
  });

  addDisclaimer(doc, PAGE_W, (doc as any).lastAutoTable.finalY);
  doc.save(`PAWPHILE_Medical_Report_${profile?.name || 'Dog'}.pdf`);
}

export async function generateVaccineReport(data: any) {
  const { profile, vaccines } = data;
  const { doc, PAGE_W, yPos: startY } = initDoc('Vaccine Report');
  
  let yPos = startY;
  doc.setFontSize(14);
  doc.text(`Patient: ${profile?.name || 'Unknown'}`, 14, yPos);
  yPos += 10;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Vaccine', 'Due Date', 'Status']],
    body: (vaccines || []).map((v: any) => [
      v.vaccineName,
      formatDateIndia(v.dueDate),
      v.status.toUpperCase()
    ]),
    theme: 'grid',
    headStyles: { fillColor: [20, 184, 166] }
  });

  addDisclaimer(doc, PAGE_W, (doc as any).lastAutoTable.finalY);
  doc.save(`PAWPHILE_Vaccine_Report_${profile?.name || 'Dog'}.pdf`);
}

export async function generateNutritionReport(data: any) {
  const { profile, nutritionLogs } = data;
  const { doc, PAGE_W, yPos: startY } = initDoc('Nutrition Report');
  
  let yPos = startY;
  const mer = calculateMER(profile);
  
  doc.setFontSize(14);
  doc.text(`Patient: ${profile?.name || 'Unknown'}`, 14, yPos);
  yPos += 8;
  doc.text(`Daily Target: ${mer} kcal`, 14, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Date', 'Food', 'Quantity (g)', 'Calories']],
    body: (nutritionLogs || []).slice(-20).map((n: any) => [
      formatDateIndia(n.occurredAt || n.date),
      n.foodName,
      n.portionGrams ?? n.quantityGrams ?? '—',
      n.totalKcal ?? n.calories ?? '—'
    ]),
    theme: 'grid',
    headStyles: { fillColor: [20, 184, 166] }
  });

  addDisclaimer(doc, PAGE_W, (doc as any).lastAutoTable.finalY);
  doc.save(`PAWPHILE_Nutrition_Report_${profile?.name || 'Dog'}.pdf`);
}

export async function generateEmergencySummary(data: any) {
  const { profile, triageHistory } = data;
  const { doc, PAGE_W, yPos: startY } = initDoc('Emergency Summary');
  
  const yPos = startY;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Date', 'Severity', 'Symptoms', 'Guidance']],
    body: (triageHistory || []).slice(-5).map((t: any) => [
      formatDateIndia(t.timestamp),
      t.result?.severity || 'N/A',
      t.symptoms?.join(', ') || 'N/A',
      t.result?.title || 'N/A'
    ]),
    theme: 'grid',
    headStyles: { fillColor: [20, 184, 166] }
  });

  addDisclaimer(doc, PAGE_W, (doc as any).lastAutoTable.finalY);
  doc.save(`PAWPHILE_Emergency_Summary_${profile?.name || 'Dog'}.pdf`);
}

export async function generateVetVisitSummary(data: any) {
  const { profile, owner, vetVisitLogs } = data;
  const { doc, PAGE_W, yPos: startY } = initDoc('Vet Visit Summary');
  
  let yPos = startY;
  
  doc.setFontSize(14);
  doc.text(`Patient: ${profile?.name || 'Unknown'}`, 14, yPos);
  yPos += 10;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Field', 'Details']],
    body: [
      ['Owner', owner?.fullName || owner?.name || 'N/A'],
      ['Preferred Vet', owner?.preferredVetName || 'N/A'],
      ['Allergies', profile?.allergies?.join(', ') || 'None'],
      ['Conditions', profile?.existingConditions?.join(', ') || 'None'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [20, 184, 166] }
  });

  const afterProfileY = (doc as any).lastAutoTable.finalY + 12;

  const visits = (vetVisitLogs || []).slice().sort((a: any, b: any) => String(b.visitDate).localeCompare(String(a.visitDate))).slice(0, 6);
  if (visits.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Recent vet visits', 14, afterProfileY);
    autoTable(doc, {
      startY: afterProfileY + 5,
      head: [['Visit date', 'Vet/Clinic', 'Reason', 'Insight']],
      body: visits.map((v: any) => [
        formatDateIndia(v.visitDate),
        `${v.vetName || '—'}${v.clinicName ? ` · ${v.clinicName}` : ''}`,
        v.reasonForVisit || '—',
        (v.vetInsightRemarks || v.diagnosisOrObservation || '—').toString().slice(0, 80),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [20, 184, 166] }
    });
    addDisclaimer(doc, PAGE_W, (doc as any).lastAutoTable.finalY);
  } else {
    addDisclaimer(doc, PAGE_W, (doc as any).lastAutoTable.finalY);
  }

  doc.save(`PAWPHILE_Vet_Visit_Summary_${profile?.name || 'Dog'}.pdf`);
}

export async function generateVisionReport(data: any) {
  const { profile, owner, result, image } = data;
  const { doc, PAGE_W, yPos: startY } = initDoc('Vision Health Scan Report');
  
  let yPos = startY;
  
  doc.setFontSize(14);
  doc.text(`Patient: ${profile?.name || 'Unknown'}`, 14, yPos);
  if (owner?.fullName) {
    yPos += 8;
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Owner: ${owner.fullName} | Phone: ${owner.phone || 'N/A'}`, 14, yPos);
  }
  doc.setTextColor(0, 0, 0);
  yPos += 12;

  // Render Image if available
  if (image) {
    try {
      doc.addImage(image, 'JPEG', 14, yPos, 60, 60);
      yPos += 65;
    } catch (e) {
      console.warn("Could not add image to PDF", e);
    }
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Scan Details', 'Result']],
    body: [
      ['Date', formatDateIndia(new Date().toISOString())],
      ['Severity', result?.severityLabel?.toUpperCase() || 'UNKNOWN'],
      ['Confidence', `${result?.confidenceScore || 0}%`],
      ['Image Quality Score', `${result?.imageQualityScore || 0}%`],
      ['Detected Concern', result?.detectedConcern || 'N/A'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [20, 184, 166] }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.text('What to Watch', 14, finalY);
  doc.setFont('helvetica', 'normal');
  const watchLines = doc.splitTextToSize((result?.whatToWatch || []).join('\n• '), PAGE_W - 28);
  doc.text(`• ${watchLines.join('')}`, 14, finalY + 6);

  const vetY = finalY + 10 + (watchLines.length * 5);
  doc.setFont('helvetica', 'bold');
  doc.text('When to Visit Vet', 14, vetY);
  doc.setFont('helvetica', 'normal');
  const vetLines = doc.splitTextToSize(result?.whenToVisitVet || 'N/A', PAGE_W - 28);
  doc.text(vetLines, 14, vetY + 6);

  addDisclaimer(doc, PAGE_W, vetY + 6 + (vetLines.length * 5));
  doc.save(`PAWPHILE_Vision_Scan_${profile?.name || 'Dog'}_${new Date().getTime()}.pdf`);
}
