// src/app/_components/StoriesStyleEditor.tsx
'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useStoriesEditor } from '../hooks/useStoriesEditor';
import DraggableTextBox from './DraggableTextBox';
import ImageFileInput from './ImageFileInput';

type StoriesStyleEditorProps = {
  onSave?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  readOnly?: boolean; // 閲覧専用モード
  initialImageUrl?: string; // 初期画像URL
  initialCaption?: string; // 初期キャプション
};

export type StoriesStyleEditorRef = {
  getCanvasBlob: () => Promise<Blob | null>;
  getAllText: () => string;
};

const StoriesStyleEditor = forwardRef<StoriesStyleEditorRef, StoriesStyleEditorProps>(
  function StoriesStyleEditor({
    onSave,
    onCancel,
    isSaving = false,
    readOnly = false,
    initialImageUrl,
    initialCaption,
  }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);

    const {
      imageUrl,
      selectImage,
      textBoxes,
      activeTextBoxId,
      addTextBox,
      updateTextBox,
      handleTextBoxPointerDown,
      handleTextBoxTouchStart,
      getCanvasBlob,
      getAllText,
    } = useStoriesEditor(initialImageUrl, initialCaption, containerRef);

    // 外部から呼び出せるメソッドを公開
    useImperativeHandle(ref, () => ({
      getCanvasBlob,
      getAllText,
    }));

    // テキスト変更ハンドラー
    const handleTextChange = (textBoxId: string, text: string) => {
      updateTextBox(textBoxId, { text });
    };

    // 画像選択ハンドラー
    const handleImageSelect = async (files: File[]) => {
      if (files.length > 0) {
        await selectImage(files[0]);
      }
    };

    // テキストボックス追加ボタン
    const handleAddTextBox = () => {
      // 画面中央に追加
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = rect.width / 2 - 125; // 幅250pxの半分
        const y = rect.height / 2 - 50; // 高さ100pxの半分
        addTextBox(x, y);
      } else {
        // フォールバック
        addTextBox(50, 50);
      }
    };

    return (
      <div className="w-full h-full flex flex-col">
        {!readOnly && (
          <div className="flex-shrink-0 flex justify-between items-center p-4 z-30">
            <button
              onClick={onCancel}
              className="text-white text-2xl leading-none w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition"
              aria-label="キャンセル"
            >
              ×
            </button>
            <button
              onClick={onSave}
              disabled={isSaving || !imageUrl}
              className="text-white font-bold text-lg px-6 py-2 bg-blue-600 rounded-full hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        )}

        {/* メインエリア */}
        <div className="flex-1 relative overflow-hidden">
          {imageUrl ? (
            <div
              ref={containerRef}
              className="relative w-full h-full flex items-center justify-center"
            >
              {/* 背景画像 */}
              <img
                src={imageUrl}
                alt="選択された画像"
                className="max-w-full max-h-full object-contain pointer-events-none"
              />

              {/* テキストボックスレイヤー */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="relative w-full h-full pointer-events-none">
                  {textBoxes.map((box) => (
                    <div key={box.id} className="pointer-events-auto">
                      <DraggableTextBox
                        textBox={box}
                        isActive={box.id === activeTextBoxId}
                        onTextChange={(text) => handleTextChange(box.id, text)}
                        onPointerDown={(e) => handleTextBoxPointerDown(e, box.id)}
                        onTouchStart={(e) => handleTextBoxTouchStart(e, box.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // 画像未選択時
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-6">📷</div>
                <p className="text-white/80 text-xl mb-6">
                  画像を選択してください
                </p>
                {!readOnly && (
                  <>
                    <label
                      htmlFor="image-select-input"
                      className="inline-block bg-white text-black px-8 py-4 rounded-full font-bold text-lg cursor-pointer hover:bg-gray-200 transition"
                    >
                      画像を選択
                    </label>
                    <ImageFileInput
                      id="image-select-input"
                      onPick={handleImageSelect}
                      multiple={false}
                      className="hidden"
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ボトムツールバー（画像選択後、編集モード時のみ） */}
        {!readOnly && imageUrl && (
          <div className="flex-shrink-0 flex items-center justify-center gap-4 p-4 z-30">
            <button
              onClick={handleAddTextBox}
              className="bg-white/20 text-white px-6 py-3 rounded-full font-medium hover:bg-white/30 transition flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              テキスト追加
            </button>
            <label
              htmlFor="image-change-input"
              className="text-white/80 px-4 py-3 hover:bg-white/10 rounded-full cursor-pointer transition text-sm"
            >
              画像を変更
            </label>
            <ImageFileInput
              id="image-change-input"
              onPick={handleImageSelect}
              multiple={false}
              className="hidden"
            />
          </div>
        )}
      </div>
    );
  }
);

export default StoriesStyleEditor;
