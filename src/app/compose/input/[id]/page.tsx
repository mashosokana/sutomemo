//app/compose/input/[id]/page.tsx
import { prisma } from "@/utils/prisma";
import { notFound } from "next/navigation";
import EditForm from "@/app/_components/EditForm";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type EditPageProps = {
  params: { id: string }
}

export default async function EditPage({ params }: EditPageProps) {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login")
  }

  const post = await prisma.post.findFirst({
    where: {
      id: Number(params.id),
      userId: user.id
    },
    include: {
      memo: {
        select: {
          answerWhy: true,
          answerWhat: true,
          answerNext: true,
        }
      }
    },
  })

  if (!post || !post.memo) {
    notFound()
  }

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">保存の編集</h1>
      <EditForm 
        id={post.id} 
        caption= {post.caption} 
        memo={{
          answerWhy: post.memo.answerWhy ?? "",
          answerWhat: post.memo.answerWhat ?? "",
          answerNext: post.memo.answerNext ?? "", 
        }} 
      />
    </main>
  );
}