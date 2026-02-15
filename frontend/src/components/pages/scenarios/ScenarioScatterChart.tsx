import React from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
  Legend,
  Cell,
} from "recharts";

export type ScenarioScatterPoint = {
  scenarioCode: string;
  scenarioGroup: string;
  ssi: number; // Self-sufficiency
  sci: number; // Self-consumption
  label: string;
  color: string; // New: Color per point
};

type Props = {
  data: ScenarioScatterPoint[];
  loading: boolean;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const pt = payload[0].payload as ScenarioScatterPoint;
    return (
      <div
        style={{
          backgroundColor: "white",
          border: `1px solid ${pt.color}`,
          padding: "8px",
          borderRadius: "4px",
          fontSize: "12px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ fontWeight: 700, color: pt.color }}>
          {pt.scenarioCode}: {pt.scenarioGroup}
        </div>
        <div>{pt.label}</div>
        <div style={{ marginTop: 4 }}>SSI: {(pt.ssi * 100).toFixed(1)}%</div>
        <div>SCI: {(pt.sci * 100).toFixed(1)}%</div>
      </div>
    );
  }
  return null;
};

export default function ScenarioScatterChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div
        style={{
            height: 320,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#888",
        }}
        >
        Loading chart...
      </div>
    );
  }

  // Calculate dynamic domain with padding
  const ssiValues = data.map((d) => d.ssi);
  const sciValues = data.map((d) => d.sci);
  
  const minSSI = Math.min(...ssiValues, 0); 
  const maxSSI = Math.max(...ssiValues, 0.4); // Ensure at least some range
  
  const minSCI = Math.min(...sciValues, 0); 
  const maxSCI = Math.max(...sciValues, 0.4);

  // Add ~10% padding
  const yDomain = [Math.max(0, minSSI - 0.05), Math.min(1, maxSSI + 1.25 * (maxSSI - minSSI) * 0.1)].map(v => Number(v.toFixed(2)));
  
  // X Domain: similar logic


  // Legend Payload (Unique Groups)
  const uniqueGroups = Array.from(new Set(data.map(d => d.scenarioGroup))).map(group => {
    const item = data.find(d => d.scenarioGroup === group);
    return { value: group, type: 'circle', color: item?.color };
  });

  return (
    <div style={{ width: "100%", height: 350 }}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="sci"
            name="Self-Consumption"
            domain={['auto', 'auto']} // Let Recharts handle auto-scaling based on data
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          >
            <Label value="Self-Consumption Index (SCI)" offset={-10} position="insideBottom" style={{fontSize: 12, fill: "#666"}} />
          </XAxis>
          <YAxis
            type="number"
            dataKey="ssi"
            name="Self-Sufficiency"
            domain={['auto', 'auto']}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          >
             {/* Center-aligned label as requested */}
            <Label 
                value="Self-Sufficiency Index (SSI)" 
                angle={-90} 
                position="center" 
                dx={-20} // Move it slightly left so it doesn't overlap ticks
                style={{fontSize: 12, fill: "#666", textAnchor: "middle"}} 
            />
          </YAxis>
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
          
          <Legend 
            verticalAlign="top" 
            height={36}
            // @ts-ignore
            payload={uniqueGroups.map(g => ({
                id: g.value,
                type: "circle",
                value: g.value,
                color: g.color // Legend uses this color
            })) as any}
          />

          <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#ccc" strokeDasharray="3 3" />

          <Scatter
            name="Scenarios"
            data={data}
            shape="circle"
          >
             {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
