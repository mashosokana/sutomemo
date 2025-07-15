//app/compose/input/page.tsx
import { redirect } from "next/navigation"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import ComposeInputForm from "./form";

export default async function ComposeInputPage() {
  const supabase =createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <ComposeInputForm userId={user.id} />; 
} 