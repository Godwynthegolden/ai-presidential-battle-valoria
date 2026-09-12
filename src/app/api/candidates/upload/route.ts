import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'candidates', 'fullbody');

    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let candidateId = 'candidate';
    let buffer: Buffer | null = null;
    let extension = 'png';

    // 1. Multipart Form Data handling
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      candidateId = (formData.get('candidateId') as string) || 'candidate';

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded in form data' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);

      if (file.name.endsWith('.webp')) extension = 'webp';
      else if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) extension = 'jpg';
      else extension = 'png';
    } 
    // 2. JSON Base64 Data URL handling
    else if (contentType.includes('application/json')) {
      const body = await req.json();
      const dataUrl = body.dataUrl || body.image;
      candidateId = body.candidateId || 'candidate';

      if (!dataUrl || typeof dataUrl !== 'string') {
        return NextResponse.json({ error: 'Missing dataUrl in JSON body' }, { status: 400 });
      }

      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return NextResponse.json({ error: 'Invalid base64 data URL format' }, { status: 400 });
      }

      const mime = matches[1];
      if (mime.includes('webp')) extension = 'webp';
      else if (mime.includes('jpeg') || mime.includes('jpg')) extension = 'jpg';
      else extension = 'png';

      buffer = Buffer.from(matches[2], 'base64');
    } else {
      return NextResponse.json({ error: 'Unsupported Content-Type. Use multipart/form-data or application/json.' }, { status: 400 });
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json({ error: 'Empty file payload' }, { status: 400 });
    }

    // Sanitize candidate ID for filesystem
    const safeCandidateId = candidateId.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const filename = `fullbody_${safeCandidateId}_${Date.now()}.${extension}`;
    const filePath = path.join(uploadsDir, filename);

    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `/uploads/candidates/fullbody/${filename}`;
    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
      sizeBytes: buffer.length,
    });
  } catch (err: any) {
    console.error('[Candidate Full-Body Upload Error]:', err);
    return NextResponse.json({
      error: err.message || 'Failed to upload full-body image',
    }, { status: 500 });
  }
}
