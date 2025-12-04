// src/components/Charts/ProvinceProductionChart.tsx

import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { useSelectedProvince } from "../contexts/SelectedProvinceContext";

// Icons (adjust paths if needed)
import solar from "../../assets/icons/solar.png";
import wind from "../../assets/icons/wind.png";
import biomass from "../../assets/icons/biomass.png";
import geothermal from "../../assets/icons/geothermal.png";
import hydro from "../../assets/icons/hydroelectric.png";

type ProductionResponse = {
  prov_cod: number;
  prov_name: string;
  solar: number;
  wind: number;
  geothermal: number;
  biomass: number;
  hydroelectric: number;
};

type ChartRow = {
  key: "solar" | "wind" | "geothermal" | "biomass" | "hydroelectric";
  name: string;
  percent: number;
  absolute: number;
};

const iconMap: Record<string, string> = {
  Solar: solar,
  Wind: wind,
  Geothermal: geothermal,
  Biomass: biomass,
  Hydroelectric: hydro,
};

// 🎨 Color map for each bar
const colorMap: Record<ChartRow["key"], string> = {
  solar: "#FACC15",         // yellow
  wind: "#7DD3FC",          // light blue
  hydroelectric: "#1D4ED8", // dark blue
  biomass: "#92400E",       // brown
  geothermal: "#B45309",    // reddish brown
};

const ProvinceProductionPercentage: React.FC = () => {
  const { selectedProvince } = useSelectedProvince();
  const [data, setData] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProvince) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `http://localhost:8000/production/${selectedProvince.COD_PROV}`
        );

        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const d: ProductionResponse = await res.json();

        const total =
          d.solar + d.wind + d.geothermal + d.biomass + d.hydroelectric;

        const calcPercent = (v: number) =>
          total === 0 ? 0 : (v / total) * 100;

        const rows: ChartRow[] = [
          {
            key: "solar",
            name: "Solar",
            percent: calcPercent(d.solar),
            absolute: d.solar,
          },
          {
            key: "wind",
            name: "Wind",
            percent: calcPercent(d.wind),
            absolute: d.wind,
          },
          {
            key: "geothermal",
            name: "Geothermal",
            percent: calcPercent(d.geothermal),
            absolute: d.geothermal,
          },
          {
            key: "biomass",
            name: "Biomass",
            percent: calcPercent(d.biomass),
            absolute: d.biomass,
          },
          {
            key: "hydroelectric",
            name: "Hydroelectric",
            percent: calcPercent(d.hydroelectric),
            absolute: d.hydroelectric,
          },
        ];

        setData(rows);
      } catch (err: any) {
        setError(err.message || "Failed to load production data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedProvince]);

  if (!selectedProvince) return <p>Select a province…</p>;
  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={{ width: "100%", height: 220 }}>
      <h3 style={{ fontSize: "13px", marginBottom: 6 }}>
        {selectedProvince.DEN_UTS} – % of production by source
      </h3>

      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 5, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          {/* X-axis with icons */}
          <XAxis
            dataKey="name"
            interval={0}
            tick={(props) => {
              const { x, y, payload } = props;
              const icon = iconMap[payload.value as string];

              return (
                <g transform={`translate(${x},${y + 8})`}>
                  <image href={icon} width={20} height={20} x={-10} />
                </g>
              );
            }}
          />

          <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} />

          <Tooltip
            formatter={(value: any, _name, entry: any) => {
              const row = entry.payload as ChartRow;
              const pct = (value as number).toFixed(1) + "%";
              return [`${pct} (abs: ${row.absolute.toLocaleString()})`, "Production"];
            }}
          />

          {/* Bars with custom colors */}
          <Bar dataKey="percent" radius={[6, 6, 0, 0]}>
            {data.map((row) => (
              <Cell key={row.key} fill={colorMap[row.key]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProvinceProductionPercentage;
