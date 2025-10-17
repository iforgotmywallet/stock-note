import { DataTable } from "~/components/data-table";
import AnalysisCard from "~/components/analysis-card";

import data from "./data.json";

export default function Page() {
  return (
    <div>
      <AnalysisCard />
      <DataTable data={data} />
    </div>
  );
}
