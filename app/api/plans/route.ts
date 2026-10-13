import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

const PHOTO_BUCKET = 'itinerary-photos';
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7;

function cleanImagePaths(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value.filter(
        (item): item is string =>
          typeof item === 'string' &&
          /^[0-9a-f-]{36}\.jpg$/i.test(item)
      )
    ),
  ].slice(0, 10);
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const supabase = getSupabase();

    const { data, error } = await getSupabase()
      .from('plans')
      .select('*')
      .order('date', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    const plansWithPhotos = await Promise.all(
      (data ?? []).map(async (plan) => {
        const paths: string[] = Array.isArray(plan.image_paths)
          ? plan.image_paths.filter(
              (path: unknown): path is string =>
                typeof path === 'string'
            )
          : [];

        const imageUrls = await Promise.all(
          paths.map(async (path) => {
            const { data: signedData, error: signedError } =
              await supabase.storage
                .from('itinerary-photos')
                .createSignedUrl(path, 60 * 60 * 24 * 7);

            if (signedError) {
              console.error('Could not generate photo URL:', signedError);
              return null;
            }

            return signedData?.signedUrl ?? null;
          })
        );

        return {
          ...plan,
          image_paths: paths,
          image_urls: imageUrls.filter(
            (url): url is string => url !== null
          ),
        };
      })
    );

    return NextResponse.json({
      plans: plansWithPhotos,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: 'Could not load plans. Check your database setup.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const { data: lastPlan, error: orderError } = await getSupabase()
      .from('plans')
      .select('sort_order')
      .eq('date', body.date)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orderError) throw orderError;

    const nextSortOrder = (lastPlan?.sort_order ?? -1) + 1;
    const date = String(body.date ?? '');
    const title = String(body.title ?? '').trim();
    if (!/^2026-10-(2[3-9]|3[01])$|^2026-11-01$/.test(date)) return NextResponse.json({ error: 'Choose a date between October 23 and November 1, 2026.' }, { status: 400 });
    if (!title) return NextResponse.json({ error: 'Give your plan a title first.' }, { status: 400 });
    const row = {
      date, title: title.slice(0, 120), description: String(body.description ?? '').slice(0, 3000),
      time: String(body.time ?? '').slice(0, 80), location: String(body.location ?? '').slice(0, 300),
      link: String(body.link ?? '').slice(0, 1000), image_url: String(body.image_url ?? '').slice(0, 1400000), image_paths: cleanImagePaths(body.image_paths),
      notes: String(body.notes ?? '').slice(0, 2000), sort_order: nextSortOrder,
    };
    const { data, error } = await getSupabase().from('plans').insert(row).select('*').single();
    if (error) throw error;
    return NextResponse.json({ plan: data }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not save this plan. Check your database setup and image/link fields.' }, { status: 500 });
  }
}
