// src/components/charts/ProvinceMonthlyChartContainer.tsx
import MonthlyChart from "../MonthlyChart";
import { useSelectedTerritory } from "../../contexts/SelectedTerritoryContext";
import useProvinceMonthlyData  from "../../../hooks/useProvinceMonthlyData";

export default function ProvinceMonthlyChartContainer() {
  const { selectedTerritory } = useSelectedTerritory();

  const provinceCode =
    selectedTerritory?.level === "province" ? selectedTerritory.codes.prov ?? null : null;

  const provinceName =
    selectedTerritory?.level === "province" ? selectedTerritory.name : null;

  const year = 2019;     // later: wire to your year selector
  const scenario = 0;    // later: wire to scenario selector

  const { data, loading, error, hasProvince } = useProvinceMonthlyData(
    provinceCode,
    year,
    scenario
  );

  return (
    <MonthlyChart
      data={data}
      loading={loading}
      error={error}
      provinceName={provinceName}
      hasProvince={hasProvince}
    />
  );
}
