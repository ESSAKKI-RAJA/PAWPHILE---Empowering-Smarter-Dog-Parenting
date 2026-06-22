"""
report_service.py
Future: generate PDF reports for vet visits, triage, vaccine records.
Currently acts as a placeholder that aggregates data for the frontend to render.
"""
import io
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors

from app.models.all_models import (
    DogProfile, VetVisitSummary, VaccineRecord,
    SymptomTriageSession, VisionScanRecord
)

def get_report_data(db: Session, dog_id: UUID) -> dict:
    """Aggregate all health data for a dog into a report payload."""
    dog = db.query(DogProfile).filter(DogProfile.id == dog_id).first()
    if not dog:
        return {}

    vaccines = db.query(VaccineRecord).filter(VaccineRecord.dog_id == dog_id).all()
    visits = db.query(VetVisitSummary).filter(VetVisitSummary.dog_id == dog_id).all()
    triage = db.query(SymptomTriageSession).filter(SymptomTriageSession.dog_id == dog_id).all()
    scans = db.query(VisionScanRecord).filter(VisionScanRecord.dog_id == dog_id).all()

    return {
        "dog": {
            "name": dog.name,
            "breed": dog.breed,
            "sex": dog.sex,
            "weight": dog.weight,
            "vaccine_status": dog.vaccine_status,
        },
        "vaccines": [{"name": v.name, "date_given": str(v.date_given), "next_due_date": str(v.next_due_date)} for v in vaccines],
        "vet_visits": [{"date": str(v.visit_date), "reason": v.reason_for_visit, "remarks": v.vet_remarks} for v in visits],
        "triage_sessions": [{"created_at": str(t.created_at), "severity": t.severity_level} for t in triage],
        "vision_scans": [{"scan_type": s.scan_type, "prediction": s.prediction, "confidence": s.confidence} for s in scans],
        "disclaimer": "PAWPHILE is a preventive care tool. It does not diagnose, treat, or replace a licensed veterinarian.",
    }

def generate_pdf_from_json(payload: dict) -> io.BytesIO:
    """Generates a professional PDF vet report using ReportLab based on structured JSON."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = styles['Heading1']
    title_style.textColor = colors.HexColor('#6D28D9') # Pawphile Purple
    subtitle_style = styles['Heading2']
    normal_style = styles['Normal']
    
    elements = []
    
    # 1. Header
    elements.append(Paragraph("PAWPHILE Health & Triage Report", title_style))
    elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%B %d, %Y')}", normal_style))
    elements.append(Spacer(1, 20))
    
    # 2. Dog Profile Section
    elements.append(Paragraph("1. Dog Profile & Demographics", subtitle_style))
    profile_data = [
        ["Name", payload.get('dog', {}).get('name', 'N/A'), "Breed", payload.get('dog', {}).get('breed', 'N/A')],
        ["Age", payload.get('dog', {}).get('age', 'N/A'), "Weight", f"{payload.get('dog', {}).get('weight', 'N/A')} kg"],
        ["Sex", payload.get('dog', {}).get('sex', 'N/A'), "Neutered", str(payload.get('dog', {}).get('neutered', 'N/A'))],
    ]
    t_profile = Table(profile_data, colWidths=[80, 150, 80, 150])
    t_profile.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#F8FAFC')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(t_profile)
    elements.append(Spacer(1, 20))
    
    # 3. Clinical Logs & Triage
    elements.append(Paragraph("2. Recent Symptom Logs & Triage", subtitle_style))
    triage_records = payload.get('triage_sessions', [])
    if triage_records:
        triage_data = [["Date", "Severity", "Symptoms"]]
        for t in triage_records:
            triage_data.append([t.get('date', 'N/A'), t.get('severity', 'N/A'), t.get('symptoms', 'N/A')])
        t_triage = Table(triage_data, colWidths=[100, 80, 280])
        t_triage.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6D28D9')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(t_triage)
    else:
        elements.append(Paragraph("No recent triage logs recorded.", normal_style))
    elements.append(Spacer(1, 20))
    
    # 4. Disclaimer (Awareness only)
    elements.append(Spacer(1, 40))
    disclaimer_style = ParagraphStyle('Disclaimer', parent=styles['Normal'], textColor=colors.HexColor('#EF4444'), fontName='Helvetica-Bold')
    elements.append(Paragraph("VETERINARY DISCLAIMER: This report is generated by PAWPHILE, an educational decision-support tool. It does NOT constitute a veterinary diagnosis. Always rely on a licensed veterinarian for medical decisions.", disclaimer_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer

