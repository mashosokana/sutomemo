'use client'

export default function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  return (
    <button
      className="bg-primary text-white py-2 w-full rounded-md disabled:opacity-50"
      {...props}
    />
  )
}
