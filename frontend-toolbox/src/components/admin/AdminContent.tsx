import AccountPanel from "./AccountPanel";
import DataImportPage from "../data-import/DataImportPage";

type Props = {
  section: "account" | "upload" | "validate";
};

export default function AdminContent({ section }: Props) {
  if (section === "account") {
    return <AccountPanel />;
  }

  if (section === "upload") {
    return <DataImportPage />;
  }

  if (section === "validate") {
    return (
      <div className="charts">
        <h3>Validate data</h3>
        <p>
          Here you will review uploaded datasets, detect nulls, mismatches,
          missing dimensions, and approve ingestion.
        </p>
      </div>
    );
  }

  return null;
}
