import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { ALLOWED_FILE_TYPES } from '@/lib/utils';

const BUCKET        = 'print-files';
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * POST /api/upload
 * Accepts a multipart form with a single `file` field.
 * Returns: { url, storage_path, name, size }
 *
 * Files are stored under:
 *   print-files/{YYYY-MM}/{randomId}-{sanitizedFilename}
 *
 * They are NOT publicly readable — the admin dashboard fetches
 * short-lived signed URLs when needed.
 */
export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate size
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_SIZE_BYTES / 1024 / 1024}MB.` },
      { status: 413 },
    );
  }

  // Validate MIME type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Allowed: PDF, JPG, PNG, TIFF.' },
      { status: 415 },
    );
  }

  // Sanitise filename — strip special chars, keep extension
  const original  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const yearMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const uid       = crypto.randomUUID().split('-')[0];     // 8-char random
  const storagePath = `${yearMonth}/${uid}-${original}`;

  const admin     = createAdminClient();
  const arrayBuf  = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuf, {
      contentType:  file.type,
      cacheControl: '3600',
      upsert:       false,
    });

  if (uploadError) {
    console.error('[upload] Supabase storage error:', uploadError);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }

  // Generate a signed URL valid for 7 days (admin can open it to download/print)
  const { data: signedData, error: signedError } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 days

  if (signedError || !signedData) {
    console.error('[upload] Signed URL error:', signedError);
    return NextResponse.json({ error: 'Upload succeeded but URL generation failed.' }, { status: 500 });
  }

  return NextResponse.json({
    url:          signedData.signedUrl,
    storage_path: storagePath,
    name:         file.name,
    size:         file.size,
  });
}

// Increase the default body size limit for this route (Next.js 14+)
export const config = {
  api: { bodyParser: false },
};
