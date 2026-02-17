// src/app/_components/DraggableTextBox.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import type { TextBox } from '../hooks/useStoriesEditor';

type DraggableTextBoxProps = {
  textBox: TextBox;
  isActive: boolean;
  onTextChange: (text: string) => void;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>) => void;
};

export default function DraggableTextBox({
  textBox,
  isActive,
  onTextChange,
  onPointerDown,
  onTouchStart,
}: DraggableTextBoxProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(textBox.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const clickTimeRef = useRef<number>(0);

  // テキストが変更されたら同期
  useEffect(() => {
    if (!isEditing) {
      setEditText(textBox.text);
    }
  }, [textBox.text, isEditing]);

  // 編集モードに入ったらフォーカス
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();

    const now = Date.now();
    const timeSinceLastClick = now - clickTimeRef.current;

    // ダブルクリック判定（300ms以内）
    if (timeSinceLastClick < 300) {
      setIsEditing(true);
      clickTimeRef.current = 0;
    } else {
      clickTimeRef.current = now;
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    onTextChange(editText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(textBox.text); // 元に戻す
    }
    // Enterキーでは改行を許可（Cmd/Ctrl+Enterで確定）
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleBlur();
    }
  };

  return (
    <div
      className={`absolute select-none px-3 py-2 rounded transition-all ${
        isActive ? 'ring-2 ring-blue-400' : ''
      } ${isEditing ? 'cursor-text' : 'cursor-move'}`}
      style={{
        left: `${textBox.x}px`,
        top: `${textBox.y}px`,
        width: `${textBox.width}px`,
        minHeight: `${textBox.height}px`,
        fontSize: `${textBox.fontSize}px`,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        zIndex: isActive ? 20 : 10,
        touchAction: isEditing ? 'auto' : 'none',
      }}
      onClick={handleClick}
      onPointerDown={isEditing || !onPointerDown ? undefined : onPointerDown}
      onTouchStart={isEditing || !onTouchStart ? undefined : onTouchStart}
      onContextMenu={(e) => e.preventDefault()}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full h-full bg-transparent text-gray-900 outline-none resize-none leading-tight"
          style={{ fontSize: `${textBox.fontSize}px`, wordBreak: 'break-all', overflowWrap: 'break-word' }}
          maxLength={500}
          placeholder="テキストを入力..."
        />
      ) : (
        <div className="w-full h-full overflow-hidden">
          {textBox.text ? (
            <p className="text-gray-900 leading-tight" style={{ wordBreak: 'break-all', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
              {textBox.text}
            </p>
          ) : (
            <p className="text-gray-400 italic text-sm">
              ダブルタップで編集
            </p>
          )}
        </div>
      )}
    </div>
  );
}
