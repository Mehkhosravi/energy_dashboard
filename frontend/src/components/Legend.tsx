import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

type LegendProps = {
  breaks: number[];
  colors: string[];
};

const Legend = ({ breaks, colors }: LegendProps) => {
  const map = useMap();

  useEffect(() => {
    const legend = new L.Control({ position: "bottomleft" });

    (legend as any).onAdd = () => {
      const div = L.DomUtil.create("div", "info legend-choropleth");

      let html = `<div class="legend-title">Legend</div>`;

      for (let i = 0; i < breaks.length - 1; i++) {
        const from = breaks[i];
        const to = breaks[i + 1];

        html += `
          <div class="legend-item">
            <div class="legend-color" style="background:${colors[i]}"></div>
            <span class="legend-text">
              ${Math.round(from).toLocaleString("it-IT")} – 
              ${Math.round(to).toLocaleString("it-IT")}
            </span>
          </div>
        `;
      }

      div.innerHTML = html;
      return div;
    };

    legend.addTo(map);

    return () => {
      map.removeControl(legend);
    };
  }, [map, breaks, colors]);

  return null;
};

export default Legend;
