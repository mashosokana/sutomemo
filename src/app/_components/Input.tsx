// src/app/_components/Input.tsx
'use client'

import React from 'react'
import clsx from 'clsx' 

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  isError?: boolean
}

const Input = React.forwardRef<HTMLInputElement, Props>(
  ({ className = '', isError, ...rest }, ref) => (
    <input
      ref={ref}
      {...rest}
      className={clsx(
        'w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500', // 基本
        isError && 'border-red-500 focus:ring-red-400',                        // エラー時
        className,                                                             // カスタム
      )}
    />
  ),
)
Input.displayName = 'Input'
export default Input
