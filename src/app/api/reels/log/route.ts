// src/app/api/reels/log/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * リールログ記録API
 * POST /api/reels/log
 *
 * 手入力された効果測定データをreels_logsテーブルに保存
 */

interface LogRequestBody {
  postLocalId: string;
  industry: string;     // 記述式（hookKey削除）
  metrics: {
    views: number;
    saves: number;
    dms: number;
  };
  postedAt: string;     // YYYY-MM-DD
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { user, error, status } = await verifyUser(request);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status });
    }

    const body: LogRequestBody = await request.json();

    // バリデーション
    if (!body.postLocalId || typeof body.postLocalId !== 'string') {
      return NextResponse.json(
        { error: 'postLocalId is required and must be a string' },
        { status: 400 }
      );
    }

    if (!body.industry || typeof body.industry !== 'string') {
      return NextResponse.json(
        { error: 'industry is required and must be a string' },
        { status: 400 }
      );
    }


    if (!body.metrics || typeof body.metrics !== 'object') {
      return NextResponse.json(
        { error: 'metrics is required and must be an object' },
        { status: 400 }
      );
    }

    const { views, saves, dms } = body.metrics;

    if (
      typeof views !== 'number' ||
      typeof saves !== 'number' ||
      typeof dms !== 'number' ||
      views < 0 ||
      saves < 0 ||
      dms < 0
    ) {
      return NextResponse.json(
        { error: 'views, saves, and dms must be non-negative numbers' },
        { status: 400 }
      );
    }

    if (!body.postedAt || typeof body.postedAt !== 'string') {
      return NextResponse.json(
        { error: 'postedAt is required and must be a string (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // DB保存（15秒固定）
    const reelsLog = await prisma.reelsLog.create({
      data: {
        userId: user.id,
        postLocalId: body.postLocalId,
        industry: body.industry,
        durationSecs: 15,  // 15秒固定
        metrics: {
          views,
          saves,
          dms,
        },
        postedAt: new Date(body.postedAt),
      },
    });

    return NextResponse.json(
      { ok: true, id: reelsLog.id },
      { status: 201 }
    );
  } catch (err) {
    console.error('Log API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * リールログ取得API
 * GET /api/reels/log
 *
 * ログイン中のユーザーのログ一覧を取得（直近10件）
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { user, error, status } = await verifyUser(request);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status });
    }

    // 直近10件取得
    const logs = await prisma.reelsLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({ logs }, { status: 200 });
  } catch (err) {
    console.error('Log GET API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
