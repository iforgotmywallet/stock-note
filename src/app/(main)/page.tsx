import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import MainPageContent from "~/components/main-page-content";

// Force dynamic rendering since we need user session
export const dynamic = "force-dynamic";

export default async function Page() {
  //Redirect to auth in not signed in
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/auth/sign-in");
  }

  return <MainPageContent userId={session.user.id} />;
}
