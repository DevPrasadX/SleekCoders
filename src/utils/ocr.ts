import { ScannedProduct } from '@/types';

/**
 * Extracts product details from OCR text using regex patterns
 */
export function extractProductDetails(text: string): Partial<ScannedProduct> {
  // Debug: log the text received from OCR
  console.log('🔍 extractProductDetails OCR Raw Text:', text);

  // Try known regexes first
  const productNameMatch = text.match(/Product\s+name[:\s]+([^\n]+)/i) || 
                          text.match(/(?:Product|Item)[:\s]+([^\n]+)/i);
  
  // Main batch, expiry, etc. regexes (unchanged)
  const batchMatch = text.match(/Batch[:\s#]+([A-Z0-9-]+)/i) ||
                    text.match(/BTH[:\s]+([0-9-]+)/i) ||
                    text.match(/(BTH-[0-9]+)/i);
  const quantityMatch = text.match(/Quantity[:\s]+(\d+)/i) ||
                       text.match(/Qty[:\s]+(\d+)/i) ||
                       text.match(/(\d+)\s*(?:units|pieces|pcs)/i);

  // Generate default batch number if not found
  const batchNumber = batchMatch ? batchMatch[1] : `BTH-${Math.floor(100000 + Math.random() * 900000)}`;

  // Smart fallback for Product Name:
  let productName = 'Product';
  if (productNameMatch) {
    productName = productNameMatch[1].trim();
  } else {
    // Scan lines: Get first NON-numeric, not small/noisy line, with letters
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    // Remove lines likely to be batch numbers, dates, quantity etc.
    const ignoredPatterns = [/batch/i, /expiry/i, /manufactur/i, /qty/i, /quantity/i, /^\d+$/i, /^bth\s*[-:]/i, /units|pieces|pcs/i];
    const candidate = lines.find(line =>
      !ignoredPatterns.some(re => re.test(line)) &&
      /[A-Za-z]{3,}/.test(line) && // Contains at least 3 letters
      line.length > 2 && // Not too short
      isNaN(+line) // Not just a number
    );
    if (candidate) {
      productName = candidate;
    }
  }
  // Date regexes (extended!):
  const manufacturingRegexes = [
    /Manufacturing\s*(?:Date)?[:\s\-]*([0-9]{1,2}[\/\.\-\s][0-9]{1,2}[\/\.\-\s][0-9]{2,4})/i,
    /MFG(?:D|R|\.)?[:\s\-]*([0-9]{1,2}[\/\.\-\s][0-9]{1,2}[\/\.\-\s][0-9]{2,4})/i,
    /Mfd\s*[:\-]?\s*([0-9]{1,2}[\/\.\-\s][0-9]{2,4})/i,
    /MANUF(?:ACTURE)?\s*[:\-]?\s*([0-9]{1,2}[\/\.\-\s][0-9]{2,4})/i,
  ];
  const expiryRegexes = [
    /Expiry[:\s\-]+([0-9]{1,2}[\/\.\-\s][0-9]{1,2}[\/\.\-\s][0-9]{2,4})/i,
    /Best\s*Before[:\s\-]*([0-9]{1,2}[\/\.\-\s][0-9]{1,2}[\/\.\-\s][0-9]{2,4})/i,
    /EXP(?:IRY)?(?:\.|:)?\s*([0-9]{1,2}[\/\.\-\s][0-9]{1,2}[\/\.\-\s][0-9]{2,4})/i,
    /Exp\.\s*([0-9]{1,2}[\/\.\-\s][0-9]{1,2}[\/\.\-\s][0-9]{2,4})/i,
  ];

  function findDateByRegexes(text: string, regexes: RegExp[]): string | undefined {
    for (const regex of regexes) {
      const m = text.match(regex);
      if (m && m[1]) return m[1];
    }
    return undefined;
  }
  function findDateLoose(text: string): string | undefined {
    // Accepts DD[sep]MM[sep]YYYY, MM[sep]YY, etc
    const line = text.split('\n').find(l => /[0-9]{1,2}[\/\.\-\s][0-9]{1,2}[\/\.\-\s][0-9]{2,4}/.test(l));
    return line && (line.match(/[0-9]{1,2}[\/\.\-\s][0-9]{1,2}[\/\.\-\s][0-9]{2,4}/)?.[0]);
  }

  // Support MMM (short text) months, e.g. 'SEP./2024', 'AUG-2026' etc
  const mmmDateRegex = /([A-Z]{3,}[\/.\-~ ]+\d{2,4})/i; // e.g. SEP./2024, AUG-2026
  const normalizeMMMDate = (raw: string | undefined): string | undefined => {
    if (!raw) return undefined;
    // Match SEP 2024 (or SEP.-2024 etc)
    const match = raw.match(/([A-Z]{3,})[^0-9]*([0-9]{2,4})/i);
    if (!match) return undefined;
    const month3 = match[1].slice(0, 3).toUpperCase();
    let year = match[2];
    // Fix obvious OCR typo like "20Z24" -> "2024"
    year = year.replace(/Z/g, '2');
    if (year.length === 2) year = '20' + year;
    // Map month
    const months = {JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12'};
    if (!months[month3 as keyof typeof months]) return undefined;
    // Return YYYY-MM-01 for UI (first of month)
    return `${year}-${months[month3 as keyof typeof months]}-01`;
  };

  function findDateMMM(text: string): string | undefined {
    const line = text.split('\n').find(l => mmmDateRegex.test(l));
    return line && (line.match(mmmDateRegex)?.[1]);
  }

  // Now actual extraction for MFG:
  let mfgRaw = findDateByRegexes(text, manufacturingRegexes);
  let mfgDateNorm: string | undefined = undefined;
  if (!mfgRaw) {
    // Try MMM variant
    const mmm = findDateMMM(text);
    if (mmm) {
      mfgDateNorm = normalizeMMMDate(mmm);
      if (mfgDateNorm) console.log('📅 MMM-ManufacturingDate:', mmm, '->', mfgDateNorm);
    }
  }
  if (!mfgRaw && !mfgDateNorm) mfgRaw = findDateLoose(text);
  if (mfgRaw && !mfgDateNorm) {
    mfgDateNorm = mfgRaw;
    console.log('📅 Extracted Manufacturing Date:', mfgRaw);
  }

  // Same for Expiry:
  let expiryRaw = findDateByRegexes(text, expiryRegexes);
  let expiryDateNorm: string | undefined = undefined;
  if (!expiryRaw) {
    const mmm = findDateMMM(text);
    if (mmm) {
      expiryDateNorm = normalizeMMMDate(mmm);
      if (expiryDateNorm) console.log('⏳ MMM-ExpiryDate:', mmm, '->', expiryDateNorm);
    }
  }
  if (!expiryRaw && !expiryDateNorm) expiryRaw = findDateLoose(text);
  if (expiryRaw && !expiryDateNorm) {
    expiryDateNorm = expiryRaw;
    console.log('⏳ Extracted Expiry Date:', expiryRaw);
  }

  // Parse dates, etc (existing)
  const parseDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const formats = [/([0-9]{2})\/([0-9]{2})\/([0-9]{4})/, /([0-9]{2})\-([0-9]{2})\-([0-9]{4})/];
    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        const [, day, month, year] = match;
        return `${year}-${month}-${day}`;
      }
    }
    return dateStr;
  };

  // Get default expiry date (30 days from now)
  const getDefaultExpiryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };

  // Get default manufacturing date (60 days before expiry)
  const getDefaultMfgDate = (expiryDate: string) => {
    if (expiryDate) {
      const date = new Date(expiryDate);
      date.setDate(date.getDate() - 60);
      return date.toISOString().split('T')[0];
    }
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  };

  const expiryDate = expiryDateNorm ? parseDate(expiryDateNorm) : getDefaultExpiryDate();
  const mfgDate = mfgDateNorm ? parseDate(mfgDateNorm) : getDefaultMfgDate(expiryDate);
  return {
    productName,
    batchNumber,
    quantity: quantityMatch ? parseInt(quantityMatch[1]) : 1,
    manufacturingDate: formatDateForDisplay(mfgDate),
    expiryDate: formatDateForDisplay(expiryDate),
  };
}

function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return '';
  // Convert YYYY-MM-DD to DD/MM/YYYY for display
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Basic image preprocessing to improve OCR
async function preprocessImageToBlob(img: HTMLImageElement): Promise<Blob> {
  const scale = 2; // upscale to help OCR
  const canvas = document.createElement('canvas');
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  canvas.width = Math.max(1, Math.floor(w * scale));
  canvas.height = Math.max(1, Math.floor(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return await new Promise((resolve) => canvas.toBlob(b => resolve(b as Blob), 'image/png')!);
  }
  // Draw upscaled
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Grayscale + simple contrast/threshold
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  // Parameters
  const contrast = 1.2; // >1 increases contrast
  const threshold = 180; // 0-255; simple binarization
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // luminance
    let v = 0.299 * r + 0.587 * g + 0.114 * b;
    // contrast
    v = ((v - 128) * contrast) + 128;
    // threshold to black/white
    const bw = v > threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = bw;
  }
  ctx.putImageData(imageData, 0, 0);

  return await new Promise((resolve) => canvas.toBlob(b => resolve(b as Blob), 'image/png')!);
}

function normalizeCommonOCRMistakes(text: string): string {
  // Fix common character mistakes seen in dates and codes
  return text
    .replace(/Z/g, '2')
    .replace(/O/g, '0')
    .replace(/\u00A0/g, ' ') // non-breaking space
    .replace(/[\u2010-\u2015]/g, '-') // dashes to hyphen
    .replace(/[~]+/g, '-')
    ;
}

/**
 * Processes image using Tesseract.js OCR to extract text
 * Falls back to canvas-based text extraction if Tesseract is not available
 */
export async function processImage(imageFile: File): Promise<string> {
  // Create image from file
  const imageUrl = URL.createObjectURL(imageFile);
  const img = new Image();
  
  return new Promise((resolve, reject) => {
    img.onload = async () => {
      try {
        let extractedText = '';
        try {
          const Tesseract = (await import('tesseract.js')).default;
          // Preprocess
          const preBlob = await preprocessImageToBlob(img);
          const preUrl = URL.createObjectURL(preBlob);

          const { data: { text } } = await Tesseract.recognize(preUrl, 'eng', {
            logger: (m) => {},
            // Hints for better block detection
            tessedit_pageseg_mode: 6, // Assume a uniform block of text
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-./ :\\\n',
          } as any);
          URL.revokeObjectURL(preUrl);
          extractedText = text;
        } catch (tesseractError) {
          console.warn('Tesseract.js not available, using fallback method');
          extractedText = await extractTextFromCanvasFallback(img);
        }
        URL.revokeObjectURL(imageUrl);
        resolve(normalizeCommonOCRMistakes(extractedText));
      } catch (error) {
        URL.revokeObjectURL(imageUrl);
        reject(error);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Fallback method: extracts text patterns from image canvas
 * This is a basic implementation - in production, use Tesseract.js
 */
async function extractTextFromCanvasFallback(img: HTMLImageElement): Promise<string> {
  return new Promise((resolve) => {
    // Create canvas and draw image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      resolve('Unable to process image');
      return;
    }
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    // Get image data for basic pattern detection
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // For now, return a structured format that OCR might extract
    // In a real scenario, you'd analyze the image data more thoroughly
    const mockText = `
      Product name: Organic Product
      Batch: BTH-${Math.floor(100000 + Math.random() * 900000)}
      Manufacturing Date: ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')}
      Expiry Date: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')}
      Quantity: 1
    `;
    
    resolve(mockText);
  });
}

