import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

const ADMIN_EMAIL = 'hudsonjmurray11@gmail.com';

async function guardAdmin() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return null;
  return user;
}

export async function GET(req: Request) {
  const user = await guardAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const semester = searchParams.get('semester');

  const admin = createAdminClient();
  let query = admin
    .from('members_dues')
    .select('*, profiles(name, grade)')
    .order('created_at', { ascending: true });

  if (semester) query = query.eq('semester', semester);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dues = (data ?? []).map((d: any) => ({
    ...d,
    name: d.profiles?.name ?? 'Unknown',
    grade: d.profiles?.grade ?? null,
  }));

  return NextResponse.json(dues);
}

export async function POST(req: Request) {
  const user = await guardAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { profile_id, amount_owed, semester, amount_paid } = body;

  if (!profile_id || amount_owed === undefined || !semester) {
    return NextResponse.json({ error: 'profile_id, amount_owed, and semester are required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('members_dues')
    .upsert(
      { profile_id, amount_owed, amount_paid: amount_paid ?? 0, semester },
      { onConflict: 'profile_id,semester' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await guardAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { id, amount_owed, amount_paid } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const admin = createAdminClient();
  const updates: Record<string, number> = {};
  if (amount_owed !== undefined) updates.amount_owed = amount_owed;
  if (amount_paid !== undefined) updates.amount_paid = amount_paid;

  const { data, error } = await admin
    .from('members_dues')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
