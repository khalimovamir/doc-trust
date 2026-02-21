/**
 * AI Lawyer - Pick document and extract text for analysis
 * TXT: read locally. PDF/DOCX/PNG: optional Edge Function extract-document-text.
 */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

const MIME_TXT = 'text/plain';
const MIME_PDF = 'application/pdf';
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MIME_PNG = 'image/png';
const MIME_JPEG = 'image/jpeg';

/**
 * Pick a document and return its text for analysis.
 * @returns {Promise<{ text: string, fileName: string }>}
 */
export async function pickDocumentAndGetText() {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      MIME_TXT,
      MIME_PDF,
      MIME_DOCX,
      MIME_PNG,
      MIME_JPEG,
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) {
    throw new Error('CANCELLED');
  }

  const file = result.assets[0];
  const { uri, name, mimeType } = file;

  if (mimeType === MIME_TXT) {
    const text = await FileSystem.readAsStringAsync(uri, {
      encoding: 'utf8',
    });
    const trimmed = (text || '').trim();
    if (!trimmed) throw new Error('The file is empty.');
    return { text: trimmed, fileName: name || 'document.txt' };
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });
  if (!base64) throw new Error('Could not read file content.');

  const { data, error } = await supabase.functions.invoke('extract-document-text', {
    body: { contentBase64: base64, mimeType: mimeType || '' },
  });

  if (error) {
    throw new Error(
      data?.error || error.message || 'Text extraction failed. Try a .txt file or paste the text.'
    );
  }
  if (data?.error) {
    throw new Error(
      typeof data.error === 'string' ? data.error : data.error?.message || 'Unsupported file type. Use .txt or paste text.'
    );
  }

  const text = (data?.text || '').trim();
  if (!text) throw new Error('No text could be extracted from this file. Try a .txt file or paste the text.');
  return { text, fileName: name || 'document' };
}

/**
 * Extract text from an image URI (camera or gallery).
 * Uses the same Edge Function as document upload (Gemini OCR).
 * @param {string} uri - Local file URI (file:// or content://)
 * @param {'image/jpeg'|'image/png'} [mimeType] - Default image/jpeg
 * @returns {Promise<string>} Extracted text
 */
export async function getTextFromImageUri(uri, mimeType = 'image/jpeg') {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  if (!base64) throw new Error('Could not read image.');
  const mime = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
  const { data, error } = await supabase.functions.invoke('extract-document-text', {
    body: { contentBase64: base64, mimeType: mime },
  });
  if (error) {
    throw new Error(data?.error || error.message || 'Text extraction failed.');
  }
  if (data?.error) {
    throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || 'Could not extract text from image.');
  }
  return (data?.text || '').trim();
}
