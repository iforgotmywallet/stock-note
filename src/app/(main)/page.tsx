import { DataTable } from "~/components/data-table";
import AnalysisSearchCard from "~/components/analysis-search-card";

import data from "./data.json";

export default function Page() {
  return (
    <div>
      <AnalysisSearchCard />
      <DataTable data={data} />
    </div>
  );
}
