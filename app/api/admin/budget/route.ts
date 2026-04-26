import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

const ADMIN_EMAIL = 'hudsonjmurray11@gmail.com';

async function guardAdmin() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return null;
  return user;
}

export async function GET() {
  const user = await guardAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('budget_categories')
    .select('*')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const user = await guardAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { name, allocated_amount, semester } = body;

  if (!name || allocated_amount === undefined || !semester) {
    return NextResponse.json({ error: 'name, allocated_amount, and semester are required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('budget_categories')
    .insert({ name, allocated_amount, semester })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await guardAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { id, name, allocated_amount, semester } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const admin = createAdminClient();
  const updates: Record<string, string | number> = {};
  if (name !== undefined) updates.name = name;
  if (allocated_amount !== undefined) updates.allocated_amount = allocated_amount;
  if (semester !== undefined) updates.semester = semester;

  const { data, error } = await admin
    .from('budget_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const user = await guardAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const admin = createAdminClient();

  const { count } = await admin
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${count} expense(s) reference this category.` },
      { status: 409 }
    );
  }

  const { error } = await admin.from('budget_categories').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
