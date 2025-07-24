import Image from 'next/image';

export default function TestImage() {
  return (
    <div className="p-4">
      <Image
        src="/icons/1453103.jpg"
        alt="スマホを見る人"
        width={200}
        height={200}
      />
    </div>
  );
}
