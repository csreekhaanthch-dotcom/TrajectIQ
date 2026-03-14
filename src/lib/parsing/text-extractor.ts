// ============================================
// Text Extraction Utility
// ============================================
// Extracts text content from various file formats
// Supports: PDF, DOCX, TXT, MD, RTF

import mammoth from 'mammoth';

// Dynamic import for pdf-parse (CommonJS module)
const pdfParse = require('pdf-parse');

// ============================================
// Types
// ============================================

export interface ExtractedText {
  text: string;
  rawBuffer: Buffer;
  fileType: string;
  fileName: string;
}

export interface TextExtractionOptions {
  maxLength?: number; // Maximum text length to extract
}

// ============================================
// Main Extraction Function
// ============================================

/**
 * Extract text content from various file formats
 * Supports: PDF, DOCX, DOC, TXT, MD, RTF
 */
export async function extractTextFromFile(
  buffer: Buffer,
  fileType: string,
  fileName: string,
  options: TextExtractionOptions = {}
): Promise<ExtractedText> {
  const lowerFileType = fileType.toLowerCase();
  const lowerFileName = fileName.toLowerCase();

  let text = '';

  // PDF files
  if (lowerFileType === 'application/pdf' || lowerFileName.endsWith('.pdf')) {
    text = await extractFromPDF(buffer);
  }
  // DOCX files
  else if (
    lowerFileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerFileName.endsWith('.docx')
  ) {
    text = await extractFromDOCX(buffer);
  }
  // DOC files (legacy Word format)
  else if (lowerFileType === 'application/msword' || lowerFileName.endsWith('.doc')) {
    throw new Error('Legacy .doc files are not supported. Please convert to .docx or .pdf format.');
  }
  // RTF files
  else if (lowerFileType === 'application/rtf' || lowerFileName.endsWith('.rtf')) {
    text = extractFromRTF(buffer);
  }
  // Plain text files
  else if (
    lowerFileType === 'text/plain' ||
    lowerFileName.endsWith('.txt') ||
    lowerFileName.endsWith('.md')
  ) {
    text = buffer.toString('utf-8');
  }
  // Unknown format - try as text
  else {
    try {
      text = buffer.toString('utf-8');
    } catch {
      throw new Error(`Unsupported file format: ${fileType || 'unknown'}. Supported formats: PDF, DOCX, TXT, MD, RTF`);
    }
  }

  // Apply max length if specified
  if (options.maxLength && text.length > options.maxLength) {
    text = text.substring(0, options.maxLength);
  }

  return {
    text,
    rawBuffer: buffer,
    fileType,
    fileName,
  };
}

// ============================================
// Format-Specific Extractors
// ============================================

/**
 * Extract text from PDF file
 */
async function extractFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfData = await pdfParse(buffer);
    return pdfData.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF file. Please ensure the file is not corrupted or password-protected.');
  }
}

/**
 * Extract text from DOCX file
 */
async function extractFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error('Failed to parse DOCX file. Please ensure the file is a valid Word document.');
  }
}

/**
 * Extract text from RTF file (basic extraction)
 */
function extractFromRTF(buffer: Buffer): string {
  const rtfContent = buffer.toString('utf-8');
  // Remove RTF control words
  const plainText = rtfContent
    .replace(/\\[a-z]+\d* ?/gi, '')
    .replace(/[{}]/g, '')
    .replace(/\\\\/g, '\\')
    .trim();
  return plainText;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if a file type is supported
 */
export function isSupportedFileType(fileType: string, fileName: string): boolean {
  const lowerFileType = fileType.toLowerCase();
  const lowerFileName = fileName.toLowerCase();

  const supportedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/rtf',
  ];

  const supportedExtensions = ['.pdf', '.docx', '.txt', '.md', '.rtf'];

  return (
    supportedTypes.includes(lowerFileType) ||
    supportedExtensions.some(ext => lowerFileName.endsWith(ext))
  );
}

/**
 * Get file extension from filename
 */
export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}
