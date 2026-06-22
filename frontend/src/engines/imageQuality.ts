/**
 * imageQuality.ts
 * Real image quality engine for PAWPHILE Vision Scan.
 * Produces a structured quality report with labeled feedback and a 0-100 score.
 * No external dependencies — runs entirely in the browser.
 */

export interface ImageQualityReport {
  score: number;           // 0-100 overall quality score
  passesMinimum: boolean;  // true if score >= 40 (usable)
  label: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  issues: string[];        // Human-readable issues found
  guidance: string;        // Actionable tip for the user
  details: {
    fileType: 'valid' | 'invalid';
    fileSizeKb: number;
    fileSizeStatus: 'too_small' | 'ok' | 'too_large';
    widthPx: number;
    heightPx: number;
    resolutionStatus: 'too_low' | 'ok' | 'high';
    brightnessScore: number;  // 0-255 average luminance
    brightnessStatus: 'too_dark' | 'ok' | 'too_bright';
    sharpnessScore: number;   // variance-based estimate 0-100
    sharpnessStatus: 'blurry' | 'soft' | 'sharp';
    framingScore: number;     // 0-100 — subject fill estimate
    framingStatus: 'too_close' | 'ok' | 'too_far';
  };
}

const VALID_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

// ── Public entry: analyzeImageQuality ───────────────────────────────────────────
export async function analyzeImageQuality(file: File): Promise<ImageQualityReport> {
  const issues: string[] = [];

  // ── 1. File type check ─────────────────────────────────────────────────────
  const fileType: 'valid' | 'invalid' = VALID_TYPES.has(file.type) ? 'valid' : 'invalid';
  if (fileType === 'invalid') {
    issues.push(`Unsupported file type (${file.type || 'unknown'}). Use JPG, PNG, or WEBP.`);
  }

  // ── 2. File size check ────────────────────────────────────────────────────
  const fileSizeKb = Math.round(file.size / 1024);
  let fileSizeStatus: 'too_small' | 'ok' | 'too_large';
  if (fileSizeKb < 30) {
    fileSizeStatus = 'too_small';
    issues.push('Image file is very small (<30 KB). Quality may be too low for screening.');
  } else if (fileSizeKb > 10000) {
    fileSizeStatus = 'too_large';
    issues.push('Image file is very large (>10 MB). This may slow down analysis.');
  } else {
    fileSizeStatus = 'ok';
  }

  // ── 3. Load image for pixel analysis ──────────────────────────────────────
  const imgData = await _loadImageData(file);
  const { width, height, data } = imgData;

  // ── 4. Resolution check ────────────────────────────────────────────────────
  const minDim = Math.min(width, height);
  let resolutionStatus: 'too_low' | 'ok' | 'high';
  if (minDim < 200) {
    resolutionStatus = 'too_low';
    issues.push(`Resolution too low (${width}×${height}px). Use a closer, higher-res photo.`);
  } else if (minDim > 3000) {
    resolutionStatus = 'high';
  } else {
    resolutionStatus = 'ok';
  }

  // ── 5. Brightness analysis ────────────────────────────────────────────────
  const brightnessScore = _averageLuminance(data);
  let brightnessStatus: 'too_dark' | 'ok' | 'too_bright';
  if (brightnessScore < 45) {
    brightnessStatus = 'too_dark';
    issues.push('Image is too dark. Move to a brighter area or add lighting.');
  } else if (brightnessScore > 220) {
    brightnessStatus = 'too_bright';
    issues.push('Image is overexposed (too bright). Avoid direct flash or harsh sunlight.');
  } else {
    brightnessStatus = 'ok';
  }

  // ── 6. Sharpness / blur estimate ──────────────────────────────────────────
  const sharpnessScore = _sharpnessEstimate(data, width, height);
  let sharpnessStatus: 'blurry' | 'soft' | 'sharp';
  if (sharpnessScore < 15) {
    sharpnessStatus = 'blurry';
    issues.push('Image appears blurry. Hold the camera still and focus before shooting.');
  } else if (sharpnessScore < 35) {
    sharpnessStatus = 'soft';
    issues.push('Image is slightly soft. Try getting closer and ensuring focus on the affected area.');
  } else {
    sharpnessStatus = 'sharp';
  }

  // ── 7. Framing / subject fill estimate ────────────────────────────────────
  const framingScore = _framingEstimate(data, width, height, brightnessScore);
  let framingStatus: 'too_close' | 'ok' | 'too_far';
  if (framingScore < 20) {
    framingStatus = 'too_far';
    issues.push('Subject appears small in frame. Move closer to the affected area.');
  } else if (framingScore > 95) {
    framingStatus = 'too_close';
    issues.push('Image may be too zoomed in. Show some surrounding area for context.');
  } else {
    framingStatus = 'ok';
  }

  // ── 8. Compute overall score ──────────────────────────────────────────────
  let score = 100;
  if (fileType === 'invalid') score -= 40;
  if (fileSizeStatus === 'too_small') score -= 25;
  if (fileSizeStatus === 'too_large') score -= 5;
  if (resolutionStatus === 'too_low') score -= 25;
  if (brightnessStatus === 'too_dark') score -= 20;
  if (brightnessStatus === 'too_bright') score -= 15;
  if (sharpnessStatus === 'blurry') score -= 30;
  if (sharpnessStatus === 'soft') score -= 10;
  if (framingStatus === 'too_far') score -= 15;
  if (framingStatus === 'too_close') score -= 10;
  score = Math.max(5, Math.min(100, score));

  // ── 9. Label and guidance ────────────────────────────────────────────────
  let label: ImageQualityReport['label'];
  let guidance: string;

  if (score >= 80) {
    label = 'Excellent';
    guidance = 'Great image! Ready for screening.';
  } else if (score >= 60) {
    label = 'Good';
    guidance = 'Image quality is good. Screening should be reliable.';
  } else if (score >= 40) {
    label = 'Fair';
    guidance = issues.length > 0
      ? `Usable but not ideal. ${issues[0]}`
      : 'Fair quality — screening may be less reliable. Retake if possible.';
  } else {
    label = 'Poor';
    guidance = issues.length > 0
      ? `Image may not scan reliably. ${issues[0]}`
      : 'Image quality is too low. Please retake in better conditions.';
  }

  return {
    score,
    passesMinimum: score >= 40,
    label,
    issues,
    guidance,
    details: {
      fileType,
      fileSizeKb,
      fileSizeStatus,
      widthPx: width,
      heightPx: height,
      resolutionStatus,
      brightnessScore: Math.round(brightnessScore),
      brightnessStatus,
      sharpnessScore: Math.round(sharpnessScore),
      sharpnessStatus,
      framingScore: Math.round(framingScore),
      framingStatus,
    },
  };
}

// ── Private helpers ──────────────────────────────────────────────────────────

function _loadImageData(file: File): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Sample a smaller version for performance (max 256px side)
      const scale = Math.min(1, 256 / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve({ data: imageData.data, width: img.width, height: img.height });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

function _averageLuminance(data: Uint8ClampedArray): number {
  let total = 0;
  const pixelCount = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    // Perceptual luminance: 0.299R + 0.587G + 0.114B
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return total / pixelCount;
}

function _sharpnessEstimate(data: Uint8ClampedArray, _w: number, _h: number): number {
  // Estimate sharpness using variance of luminance
  let sum = 0; let sumSq = 0;
  const pixelCount = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += lum; sumSq += lum * lum;
  }
  const mean = sum / pixelCount;
  const variance = sumSq / pixelCount - mean * mean;
  // Map variance to 0-100 (variance >1000 = very sharp, <50 = blurry)
  return Math.min(100, Math.round(variance / 12));
}

function _framingEstimate(data: Uint8ClampedArray, _w: number, _h: number, avgLum: number): number {
  // Estimate subject fill: ratio of pixels "close to" average luminance vs edge pixels
  // Simple heuristic: higher variance in center = more subject content
  const pixelCount = data.length / 4;
  let nonEdgePx = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (Math.abs(lum - avgLum) < 60) nonEdgePx++;
  }
  return Math.round((1 - nonEdgePx / pixelCount) * 100);
}
