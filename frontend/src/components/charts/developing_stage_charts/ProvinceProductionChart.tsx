import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useSelectedProvince } from "../contexts/SelectedProvinceContext";

type ProvinceProduction = {
  prov_cod: number;
  prov_name: string;
  solar: number;
  wind: number;
  geothermal: number;
  biomass: number;
  hydroelectric: number;
  total: number;
};

const ProvinceProductionChart: React.FC = () => {
  const [data, setData] = useState<ProvinceProduction | null>(null);
  const [loading, setLoading] = useState(false);
  const { selectedProvince } = useSelectedProvince();
  const provCod = selectedProvince?.COD_PROV;

  useEffect(() => {
    if (provCod == null) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://127.0.0.1:8000/production/${provCod}`);
        if (!res.ok) {
          throw new Error("Failed to fetch production data");
        }
        const json: ProvinceProduction = await res.json();
        console.log("production data:", json);
        setData(json);
      } catch (err) {
        console.error(err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [provCod]);

  if (provCod == null) {
    return <p>Select a province…</p>;
  }

  if (loading || !data) {
    return <p>Loading production chart…</p>;
  }

  const chartData = [
    { name: "Solar", value: data.solar },
    { name: "Wind", value: data.wind },
    { name: "Geothermal", value: data.geothermal },
    { name: "Biomass", value: data.biomass },
    { name: "Hydroelectric", value: data.hydroelectric },
    // if you want to show total too:
    // { name: "Total", value: data.total },
  ];

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <h3 style={{ marginLeft: 40 }}>
        Annual production – {data.prov_name} (prov_cod: {data.prov_cod})
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 16, right: 16, bottom: 24, left: 40 }}
        >
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#16a34a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProvinceProductionChart;
