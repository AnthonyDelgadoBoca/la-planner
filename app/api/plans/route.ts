import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { data, error } = await getSupabase().from('plans').select('*').order('date', { ascending: true }).order('created_at', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ plans: data ?? [] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not load plans. Check your database setup.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const date = String(body.date ?? '');
    const title = String(body.title ?? '').trim();
    if (!/^2026-10-(2[3-9]|3[01])$|^2026-11-01$/.test(date)) return NextResponse.json({ error: 'Choose a date between October 23 and November 1, 2026.' }, { status: 400 });
    if (!title) return NextResponse.json({ error: 'Give your plan a title first.' }, { status: 400 });
    const row = {
      date, title: title.slice(0, 120), description: String(body.description ?? '').slice(0, 3000),
      time: String(body.time ?? '').slice(0, 80), location: String(body.location ?? '').slice(0, 300),
      link: String(body.link ?? '').slice(0, 1000), image_url: String(body.image_url ?? '').slice(0, 1400000),
      notes: String(body.notes ?? '').slice(0, 2000),
    };
    const { data, error } = await getSupabase().from('plans').insert(row).select('*').single();
    if (error) throw error;
    return NextResponse.json({ plan: data }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not save this plan. Check your database setup and image/link fields.' }, { status: 500 });
  }
}
