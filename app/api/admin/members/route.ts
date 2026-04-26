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
  const [profilesRes, { data: authData }] = await Promise.all([
    admin.from('profiles').select('*').order('name'),
    admin.auth.admin.listUsers(),
  ]);

  if (profilesRes.error) {
    return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });
  }

  const emailMap = new Map((authData?.users ?? []).map(u => [u.id, u.email ?? '']));
  const members = (profilesRes.data ?? []).map(p => ({
    ...p,
    email: emailMap.get(p.id) ?? '',
  }));

  return NextResponse.json(members);
}

export async function POST(req: Request) {
  const user = await guardAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { name, email, password, role, grade } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'name, email, and password are required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    user_metadata: { name, role: role ?? 'member', grade: grade ?? null },
    email_confirm: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.user.id, email, name, role, grade }, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await guardAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { id, name, role, grade } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const admin = createAdminClient();
  const updates: Record<string, string | null> = {};
  if (name !== undefined) updates.name = name;
  if (role !== undefined) updates.role = role;
  if (grade !== undefined) updates.grade = grade;

  const { error } = await admin.from('profiles').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const user = await guardAdmin();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
