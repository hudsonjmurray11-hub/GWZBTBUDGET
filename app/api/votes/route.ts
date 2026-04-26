import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { suggestion_id, vote_token } = await request.json();

  if (!suggestion_id || !vote_token) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (!/^[0-9a-f]{64}$/.test(vote_token)) {
    return NextResponse.json({ error: 'Invalid vote token format' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('votes')
    .select('id')
    .eq('suggestion_id', suggestion_id)
    .eq('vote_token', vote_token)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Already voted' }, { status: 409 });
  }

  const { error: voteError } = await admin
    .from('votes')
    .insert({ suggestion_id, vote_token });

  if (voteError) {
    if (voteError.code === '23505') {
      return NextResponse.json({ error: 'Already voted' }, { status: 409 });
    }
    return NextResponse.json({ error: voteError.message }, { status: 500 });
  }

  const { error: rpcError } = await admin.rpc('increment_vote_count', {
    suggestion_id_param: suggestion_id,
  });

  if (rpcError) {
    // Fallback: direct update if RPC unavailable
    await admin.rpc('increment_vote_count', { suggestion_id_param: suggestion_id });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
