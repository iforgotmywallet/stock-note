import { ReportDataTable } from "~/components/report-data-table";
import AnalysisSearchCard from "~/components/analysis-search-card";

import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// Force dynamic rendering since we need user session
export const dynamic = 'force-dynamic'

export default async function Page() {

  //Redirect to auth in not signed in
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/auth/sign-in");
  }

  return (
    <div>
      <AnalysisSearchCard />
      <ReportDataTable userId={session.user.id} />
    </div>
  );
}
