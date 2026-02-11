"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import FabricCanvasEditor, { FabricCanvasEditorRef } from "../_components/FabricCanvasEditor";

export default function SimpleMemoPage() {
  const { session, token, isLoading } = useSupabaseSession();
  const router = useRouter();

  // メモ入力
  const [todayActivity, setTodayActivity] = useState("");

  // 画像関連
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<FabricCanvasEditorRef>(null);

  // メトリクス
  const [totalPosts, setTotalPosts] = useState(0);
  const [weekPosts, setWeekPosts] = useState(0);

  // 認証チェック
  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login");
    }
  }, [isLoading, session, router]);

  // データ取得
  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        // 統計データ取得
        const statsRes = await fetch("/api/dashboard/stats", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setTotalPosts(statsData.totalPosts || 0);
          setWeekPosts(statsData.weekPosts || 0);
        }
      } catch (error) {
        console.error("Data fetch error:", error);
      }
    };

    fetchData();
  }, [token]);

  // データ再取得
  const refreshData = async () => {
    if (!token) return;
    try {
      // 統計データ取得
      const statsRes = await fetch("/api/dashboard/stats", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setTotalPosts(statsData.totalPosts || 0);
        setWeekPosts(statsData.weekPosts || 0);
      }
    } catch (error) {
      console.error("Data refresh error:", error);
    }
  };

  // 画像アップロード処理
  const processFile = async (file: File) => {
    setIsUploading(true);
    try {
      const localUrl = URL.createObjectURL(file);
      setUploadedImageUrl(localUrl);
    } catch (error) {
      console.error("Image upload error:", error);
      alert("画像のアップロードに失敗しました");
    } finally {
      setIsUploading(false);
    }
  };

  // 画像アップロード（input）
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  // ドラッグ&ドロップ処理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("画像ファイルをアップロードしてください");
      return;
    }

    await processFile(file);
  };

  // 保存処理
  const handleSave = async () => {
    if (!todayActivity.trim()) {
      alert("「今日やったこと」を入力してください");
      return;
    }

    if (!uploadedImageUrl || !canvasRef.current) {
      alert("画像をアップロードしてください");
      return;
    }

    if (!token) {
      alert("認証エラーが発生しました");
      return;
    }

    setIsSaving(true);
    try {
      // 1. 投稿を作成
      const postRes = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          caption: todayActivity,
        }),
      });

      if (!postRes.ok) {
        const errorData = await postRes.json();
        throw new Error(errorData.error || "投稿の作成に失敗しました");
      }

      const { post } = await postRes.json();
      const postId = post.id;

      // 2. canvasから画像Blobを取得
      const blob = await canvasRef.current.getCanvasBlob();
      if (!blob) {
        throw new Error("画像の生成に失敗しました");
      }

      // 3. BlobをFileに変換
      const file = new File([blob], `memo-${Date.now()}.png`, {
        type: "image/png",
      });

      // 4. 画像をアップロード
      const formData = new FormData();
      formData.append("file", file);

      const imageRes = await fetch(`/api/posts/${postId}/images`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!imageRes.ok) {
        const errorData = await imageRes.json();
        throw new Error(errorData.error || "画像のアップロードに失敗しました");
      }

      // 5. 成功フラグを立てる
      setSaveSuccess(true);

      // 6. データを再取得
      await refreshData();
    } catch (error) {
      console.error("Save error:", error);
      alert(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  // もう1つ作る
  const handleCreateAnother = () => {
    setTodayActivity("");
    setUploadedImageUrl(null);
    setSaveSuccess(false);
  };

  if (isLoading) {
    return <div className="p-4">読み込み中...</div>;
  }

  if (!session) {
    return null;
  }

  // 保存成功画面
  if (saveSuccess) {
    return (
      <main className="max-w-5xl mx-auto p-4 md:p-6 bg-white min-h-screen">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">保存完了！</h2>
            <p className="text-lg text-gray-600">メモを保存しました</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <button
              onClick={handleCreateAnother}
              className="flex-1 bg-black text-white py-4 rounded-lg font-bold text-lg hover:bg-gray-800 transition"
            >
              もう1つ作る
            </button>
            <button
              onClick={() => router.push("/posts")}
              className="flex-1 bg-gray-200 text-gray-800 py-4 rounded-lg font-bold text-lg hover:bg-gray-300 transition"
            >
              一覧を見る
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-6 bg-white min-h-screen">
      {/* ヘッダー */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            画像メモ作成
          </h1>
          <p className="text-gray-600 mt-1">画像を選んで、テキストを追加しよう</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-500">総メモ数</p>
            <p className="text-2xl font-bold text-gray-900">{totalPosts}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">今週</p>
            <p className="text-2xl font-bold text-green-600">{weekPosts}</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* ステップ1: 画像アップロード */}
        <div className="bg-white rounded-lg p-8 border-2 border-gray-300">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
              1
            </span>
            <label className="font-bold text-xl">画像を選択</label>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-4 border-dashed rounded-lg p-12 text-center transition ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 bg-gray-50"
            }`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="image-upload"
            />
            <div className="pointer-events-none">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-xl font-semibold text-gray-700 mb-2">
                {isDragging ? "ここにドロップ" : "画像を選択"}
              </p>
              <p className="text-base text-gray-500">
                クリックまたはドラッグ＆ドロップ
              </p>
            </div>
          </div>

          {isUploading && (
            <p className="mt-3 text-center text-base text-blue-600">
              アップロード中...
            </p>
          )}
          {uploadedImageUrl && (
            <p className="mt-3 text-center text-base text-green-600 font-semibold">
              ✓ 画像を読み込みました
            </p>
          )}
        </div>

        {/* ステップ2: テキスト入力と編集 */}
        {uploadedImageUrl && (
          <div className="bg-white rounded-lg p-8 border-2 border-gray-300">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                2
              </span>
              <h2 className="font-bold text-xl">テキスト入力とレイアウト調整</h2>
            </div>
            <p className="text-gray-600 mb-6 text-base">
              テキストを入力し、白いボックスをドラッグして位置を調整できます。スライダーでサイズも変更できます。
            </p>
            <FabricCanvasEditor
              ref={canvasRef}
              imageUrl={uploadedImageUrl}
              initialText={todayActivity}
              onTextChange={setTodayActivity}
            />
          </div>
        )}

        {/* ステップ3: 保存 */}
        <div className="bg-white rounded-lg p-8 border-2 border-gray-300">
          <div className="flex items-center gap-3 mb-6">
            <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
              3
            </span>
            <h2 className="font-bold text-xl">保存</h2>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || !todayActivity.trim() || !uploadedImageUrl}
            className="w-full bg-black text-white py-6 rounded-lg font-bold text-2xl hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </main>
  );
}
