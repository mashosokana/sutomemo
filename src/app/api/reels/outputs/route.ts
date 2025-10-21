// src/app/api/reels/outputs/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type SaveBody = {
  postLocalId?: unknown;
  caption?: unknown;
  hook?: unknown;
  problem?: unknown;
  evidence?: unknown;
  action?: unknown;
  hashtags?: unknown;
};

function ensureString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function ensureStringArray(value: unknown, field: string): string[] {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array`);
  }
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      throw new Error(`${field} must contain only strings`);
    }
    if (item.trim() !== '') {
      result.push(item.trim());
    }
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const { user, error, status } = await verifyUser(request);
    if (error || !user) {
      return NextResponse.json({ error: error ?? 'Unauthorized' }, { status });
    }

    let payload: SaveBody;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    let postLocalId: string;
    let caption: string;
    let hook: string;
    let problem: string;
    let evidence: string;
    let action: string;
    let hashtags: string[];

    try {
      postLocalId = ensureString(payload.postLocalId, 'postLocalId');
      caption = ensureString(payload.caption, 'caption');
      hook = ensureString(payload.hook, 'hook');
      problem = ensureString(payload.problem, 'problem');
      evidence = ensureString(payload.evidence, 'evidence');
      action = ensureString(payload.action, 'action');
      hashtags = ensureStringArray(payload.hashtags, 'hashtags');
    } catch (validationError) {
      return NextResponse.json(
        { error: validationError instanceof Error ? validationError.message : 'Invalid payload' },
        { status: 400 }
      );
    }

    const existing = await prisma.reelsOutput.findUnique({
      where: { postLocalId },
    });

    if (existing && existing.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const saved = await prisma.reelsOutput.upsert({
      where: { postLocalId },
      update: {
        caption,
        hook,
        problem,
        evidence,
        action,
        hashtags,
        userId: user.id,
      },
      create: {
        userId: user.id,
        postLocalId,
        caption,
        hook,
        problem,
        evidence,
        action,
        hashtags,
      },
    });

    return NextResponse.json({ output: saved }, { status: 201 });
  } catch (err) {
    console.error('POST /api/reels/outputs error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, error, status } = await verifyUser(request);
    if (error || !user) {
      return NextResponse.json({ error: error ?? 'Unauthorized' }, { status });
    }

    const url = new URL(request.url);
    const postLocalId = url.searchParams.get('postLocalId');

    if (postLocalId) {
      const output = await prisma.reelsOutput.findUnique({
        where: { postLocalId },
      });

      if (!output || output.userId !== user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      return NextResponse.json({ output }, { status: 200 });
    }

    const outputs = await prisma.reelsOutput.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({ outputs }, { status: 200 });
  } catch (err) {
    console.error('GET /api/reels/outputs error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
