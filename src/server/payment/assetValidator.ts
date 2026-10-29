// =========================================================================
// Server & Client Logo Asset Validator
// Enforces size, MIME types, and malicious SVG script sanitization.
// =========================================================================

export const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml'
];

export interface AssetValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export function validateLogoFile(file: { size: number; type: string; name?: string }): AssetValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.size > MAX_LOGO_BYTES) {
    return {
      valid: false,
      error: `Logo file exceeds maximum size of 2MB (Provided: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`,
      sizeBytes: file.size,
      mimeType: file.type
    };
  }

  const mime = file.type.toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    return {
      valid: false,
      error: `Unsupported file type "${file.type}". Allowed formats: PNG, JPEG, WebP, SVG.`,
      sizeBytes: file.size,
      mimeType: file.type
    };
  }

  return { valid: true, mimeType: mime, sizeBytes: file.size };
}

export function sanitizeSvgContent(svgString: string): { safe: boolean; error?: string } {
  // Reject scripts and inline event handlers
  const lower = svgString.toLowerCase();
  const dangerousPatterns = [
    /<script\b[^>]*>/i,
    /<\/script>/i,
    /javascript:/i,
    /\bon\w+\s*=/i, // onload, onerror, onclick, etc.
    /<foreignobject\b[^>]*>/i,
    /<embed\b[^>]*>/i,
    /<object\b[^>]*>/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(lower)) {
      return { safe: false, error: 'Malicious or executable elements detected in SVG upload.' };
    }
  }

  return { safe: true };
}

export function validateDataUrl(dataUrl: string): AssetValidationResult {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return { valid: false, error: 'Invalid data URL format' };
  }

  const match = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!match) {
    return { valid: false, error: 'Malformed base64 data URL' };
  }

  const mimeType = match[1].toLowerCase();
  const base64Data = match[2];

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: `Disallowed MIME type: ${mimeType}` };
  }

  // Calculate approximate decoded byte size
  const approximateSize = (base64Data.length * 3) / 4;
  if (approximateSize > MAX_LOGO_BYTES) {
    return {
      valid: false,
      error: `Payload exceeds 2MB limit (approx ${(approximateSize / (1024 * 1024)).toFixed(2)}MB)`
    };
  }

  if (mimeType === 'image/svg+xml') {
    try {
      const decodedSvg = typeof atob !== 'undefined' ? atob(base64Data) : Buffer.from(base64Data, 'base64').toString('utf8');
      const svgCheck = sanitizeSvgContent(decodedSvg);
      if (!svgCheck.safe) {
        return { valid: false, error: svgCheck.error };
      }
    } catch {
      return { valid: false, error: 'Failed to parse SVG base64 content' };
    }
  }

  return { valid: true, mimeType, sizeBytes: Math.round(approximateSize) };
}
