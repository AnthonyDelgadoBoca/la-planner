import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: NextRequest, context: Context) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await context.params;
    const body = await request.json();
    const allowed = ['date', 'title', 'description', 'time', 'location', 'link', 'image_url', 'notes'] as const;
    const update: Record<string, string> = {};
    for (const key of allowed) if (body[key] !== undefined) {
      const limit =
        key === 'image_url'
          ? 1_400_000
          : key === 'description' || key === 'notes'
            ? 3000
            : 2000;

      update[key] = String(body[key]).slice(0, limit);
    }
    if (update.date && !/^2026-10-(2[3-9]|3[01])$|^2026-11-01$/.test(update.date)) return NextResponse.json({ error: 'Choose a date between October 23 and November 1, 2026.' }, { status: 400 });
    if (update.title !== undefined && !update.title.trim()) return NextResponse.json({ error: 'A title is required.' }, { status: 400 });
    const { data, error } = await getSupabase().from('plans').update(update).eq('id', id).select('*').single();
    if (error) throw error;
    return NextResponse.json({ plan: data });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not update this plan.' }, { status: 500 });
  }
}
export async function DELETE(_request: NextRequest, context: Context) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await context.params;
    const { error } = await getSupabase().from('plans').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not delete this plan.' }, { status: 500 });
  }
}
