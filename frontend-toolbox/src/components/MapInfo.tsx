
import ProvinceProduction from "./charts/ProvinceProduction";
import { useSelectedProvince } from "./contexts/SelectedProvinceContext";

export const MapInfo = () => {
  const { selectedProvince } = useSelectedProvince();
  return (
    <div className="map-info">
      <div className="map-info-header">{selectedProvince?.DEN_UTS}</div>
      <div className="map-info-body">
        {selectedProvince ?.COD_PROV},
        {selectedProvince ?.CONS_ANNO}
      </div>
        <div className="chart-card">
          <div className="chart-container">
            <ProvinceProduction />
          </div>
        </div>
      </div>
  );
};
