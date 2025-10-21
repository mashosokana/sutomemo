// src/app/api/reels/render/route.ts

import { NextRequest, NextResponse } from 'next/server';

/**
 * リール動画レンダリングAPI（ダミー実装）
 * POST /api/reels/render
 *
 * TODO: 実際の動画レンダリング処理を実装
 * - Canvasで静止画＋テキスト合成
 * - 15フレーム×1秒 or 30フレーム×1秒に分割
 * - webm または mp4 に変換
 *
 * 現在は501（未実装）を返し、将来の拡張に備える
 */

interface RenderRequestBody {
  postLocalId: string;
  duration: 15 | 30;
  frameText: {
    hook: string;
    problem: string;
    evidence: string;
    action: string;
    tags: string[];
  };
  layout: {
    safeMarginPx: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: RenderRequestBody = await request.json();

    // バリデーション
    if (!body.postLocalId || typeof body.postLocalId !== 'string') {
      return NextResponse.json(
        { error: 'postLocalId is required and must be a string' },
        { status: 400 }
      );
    }

    if (body.duration !== 15 && body.duration !== 30) {
      return NextResponse.json(
        { error: 'duration must be 15 or 30' },
        { status: 400 }
      );
    }

    if (!body.frameText || typeof body.frameText !== 'object') {
      return NextResponse.json(
        { error: 'frameText is required' },
        { status: 400 }
      );
    }

    // TODO: 実際のレンダリング処理
    // 1. Canvasで1080x1920の静止画を生成
    // 2. テキストを安全マージン内に配置
    // 3. フレーム分割（15fps * duration または 30fps * duration）
    // 4. FFmpeg WASM または MediaRecorder API で動画化
    // 5. Blob URLを返却

    // 現在はダミーレスポンス
    return NextResponse.json(
      {
        error: 'Rendering not yet implemented',
        message: 'TODO: Canvas合成 → 動画変換処理を実装してください',
        videoBlobUrl: null,
        thumbnailDataUrl: null,
      },
      { status: 501 } // Not Implemented
    );
  } catch (err) {
    console.error('Render API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
