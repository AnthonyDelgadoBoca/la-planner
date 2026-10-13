import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File) || file.type !== 'image/jpeg') {
      return NextResponse.json(
        { error: 'Please select a valid photo.' },
        { status: 400 }
      );
    }

    if (file.size > 4 * 1024 * 1024 || file.size === 0) {
      return NextResponse.json(
        { error: 'Each compressed photo must be under 4 MB.' },
        { status: 413 }
      );
    }

    const path = `${crypto.randomUUID()}.jpg`;
    const supabase = getSupabase();

    const { error } = await supabase.storage
      .from('itinerary-photos')
      .upload(path, Buffer.from(await file.arrayBuffer()), {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) throw error;

    const { data, error: signError } = await supabase.storage
      .from('itinerary-photos')
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    if (signError || !data) {
      throw signError ?? new Error('Could not display the photo.');
    }

    return NextResponse.json({ path, url: data.signedUrl });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: 'Upload failed. Check your Supabase Storage setup.' },
      { status: 500 }
    );
  }
}