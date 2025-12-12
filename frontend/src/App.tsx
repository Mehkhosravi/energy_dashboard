import "leaflet/dist/leaflet.css";
import ProvinceConsumptionMap from "./components/map/ProvinceConsumptionMap";
import Grid from "./components/Grid";
import MunicipalityMap from "./components/map/MunicipalityMap";

function SidePanelMock() {
  return (
    <div>
      <h3>Map panel</h3>
      <p>Here we will put Layers / Legend etc.</p>
    </div>
  );
}

function App() {
  return (
    <Grid
      side={<SidePanelMock />}
      map={<MunicipalityMap />}
    />
  );
}

export default App;