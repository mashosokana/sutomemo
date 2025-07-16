//app/compose/input/[id]/page.tsx

import EditForm from "@/app/_components/EditForm";

type EditPageProps = {
  params: { id: string }
}

export default function EditPage({ params }: EditPageProps) {
  const postId = Number(params.id);

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">保存の編集</h1>
      <EditForm  id={postId} />
    </main>
  );
}