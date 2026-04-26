import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { anthropic } from '@/lib/anthropic';

const ANIMALS = [
  'Owl', 'Bear', 'Falcon', 'Fox', 'Wolf', 'Eagle', 'Hawk', 'Deer',
  'Lynx', 'Raven', 'Crane', 'Otter', 'Moose', 'Bison', 'Heron',
];

function randomAnonName(): string {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `Anonymous ${animal}`;
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { body: suggestionBody, category } = body;

  if (!suggestionBody || typeof suggestionBody !== 'string' || suggestionBody.trim().length < 10) {
    return NextResponse.json(
      { error: 'Suggestion must be at least 10 characters.' },
      { status: 400 }
    );
  }

  // AI moderation
  const moderationPrompt = `You are a content moderator for a fraternity budget transparency platform.
Evaluate this suggestion and respond with valid JSON only.

Suggestion: "${suggestionBody.trim()}"
Category: "${category ?? 'General'}"

Check for:
- Off-topic content (not related to fraternity finances, events, or chapter operations)
- Inappropriate, offensive, or harassing content
- Near-duplicate of common suggestions (be lenient on this)

Respond with exactly this JSON structure:
{
  "flagged": true | false,
  "reason": "brief reason if flagged, empty string if not"
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 150,
      messages: [{ role: 'user', content: moderationPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);

    if (result.flagged === true) {
      return NextResponse.json(
        { error: `Suggestion flagged: ${result.reason}` },
        { status: 400 }
      );
    }
  } catch {
    // Fail open — allow submission if AI moderation errors
    console.error('AI moderation failed, allowing submission');
  }

  const { data, error } = await supabase
    .from('suggestions')
    .insert({
      anon_name: randomAnonName(),
      body: suggestionBody.trim(),
      category: category ?? 'General',
      status: 'pending',
      vote_count: 0,
      flagged: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
