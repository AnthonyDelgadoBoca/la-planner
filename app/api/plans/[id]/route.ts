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

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: NextRequest, context: Context) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const supabase = getSupabase();

    // Get the photos already associated with this plan.
    const { data: existingPlan, error: fetchError } = await supabase
      .from('plans')
      .select('image_paths')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Regular text fields.
    const allowed = [
      'date',
      'title',
      'description',
      'time',
      'location',
      'link',
      'image_url',
      'notes',
    ] as const;

    const update: Record<string, unknown> = {};

    for (const key of allowed) {
      if (body[key] !== undefined) {
        const limit =
          key === 'image_url'
            ? 1_400_000
            : key === 'description' || key === 'notes'
              ? 3000
              : 2000;

        update[key] = String(body[key]).slice(0, limit);
      }
    }
    
    if (body.sort_order !== undefined) {
      const sortOrder = Number(body.sort_order);

      if (
        !Number.isInteger(sortOrder) ||
        sortOrder < 0 ||
        sortOrder > 10000
      ) {
        return NextResponse.json(
          { error: 'Invalid card order.' },
          { status: 400 }
        );
      }

      update.sort_order = sortOrder;
    }

    // Handle multiple photo paths separately from regular text fields.
    if (body.image_paths !== undefined) {
      if (!Array.isArray(body.image_paths)) {
        return NextResponse.json(
          { error: 'Invalid photo list.' },
          { status: 400 }
        );
      }

      if (body.image_paths.length > 10) {
        return NextResponse.json(
          { error: 'Each plan can have up to 10 photos.' },
          { status: 400 }
        );
      }

      const validPaths = body.image_paths.every(
        (path: unknown) =>
          typeof path === 'string' &&
          /^[0-9a-f-]{36}\.jpg$/i.test(path)
      );

      if (!validPaths) {
        return NextResponse.json(
          { error: 'One or more photo paths are invalid.' },
          { status: 400 }
        );
      }

      update.image_paths = [...new Set(body.image_paths)];
    }

    if (
      typeof update.date === 'string' &&
      !/^2026-10-(2[3-9]|3[01])$|^2026-11-01$/.test(update.date)
    ) {
      return NextResponse.json(
        {
          error:
            'Choose a date between October 23 and November 1, 2026.',
        },
        { status: 400 }
      );
    }

    if (
      update.title !== undefined &&
      typeof update.title === 'string' &&
      !update.title.trim()
    ) {
      return NextResponse.json(
        { error: 'A title is required.' },
        { status: 400 }
      );
    }

    // Save the updated plan.
    const { data, error } = await supabase
      .from('plans')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    // Delete photo files that were removed from the plan.
    if (body.image_paths !== undefined) {
      const oldPaths: string[] = Array.isArray(
        existingPlan.image_paths
      )
        ? existingPlan.image_paths.filter(
            (path: unknown): path is string =>
              typeof path === 'string' &&
              /^[0-9a-f-]{36}\.jpg$/i.test(path)
          )
        : [];

      const newPaths = update.image_paths as string[];

      const removedPaths = oldPaths.filter(
        (path) => !newPaths.includes(path)
      );

      if (removedPaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('itinerary-photos')
          .remove(removedPaths);

        if (storageError) {
          console.error(
            'Plan saved, but some removed photos could not be deleted:',
            storageError
          );
        }
      }
    }

    return NextResponse.json({ plan: data });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: 'Could not update this plan.' },
      { status: 500 }
    );
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
