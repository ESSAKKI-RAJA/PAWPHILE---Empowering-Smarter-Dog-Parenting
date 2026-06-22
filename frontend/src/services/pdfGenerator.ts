import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePdfFromElement = async (elementId: string, filename: string = 'Pawphile_Master_Report.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  // Add a temporary class to optimize for PDF rendering (remove dark mode, ensure white background)
  const originalClassName = element.className;
  element.className = `${originalClassName} bg-white text-black p-8 print-mode`;
  
  // Temporarily force dark mode elements to be light mode for printing
  const isDarkMode = document.documentElement.classList.contains('dark');
  if (isDarkMode) document.documentElement.classList.remove('dark');

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    
    // Calculate PDF dimensions (A4 size)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    const ratio = pdfWidth / imgWidth;
    let totalHeight = imgHeight * ratio;
    
    let position = 0;
    
    // Add first page
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight * ratio);
    totalHeight -= pdfHeight;
    position -= pdfHeight;
    
    // Add subsequent pages if the content is longer than one page
    while (totalHeight > 0) {
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight * ratio);
      totalHeight -= pdfHeight;
      position -= pdfHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
  } finally {
    // Restore original classes
    element.className = originalClassName;
    if (isDarkMode) document.documentElement.classList.add('dark');
  }
};
