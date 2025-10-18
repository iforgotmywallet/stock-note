import { DataTable } from "~/components/data-table";
import AnalysisSearchCard from "~/components/analysis-search-card";

import data from "public/data.json";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

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
      <DataTable data={data} />
    </div>
  );
}
