import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import TablePageContent from "~/components/table-page-content";

// Force dynamic rendering since we need user session
export const dynamic = "force-dynamic";

export default async function TablePage() {
  // Redirect to auth if not signed in
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/auth/sign-in");
  }

  return <TablePageContent userId={session.user.id} />;
}