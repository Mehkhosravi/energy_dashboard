
import ProvinceConsumptionMap from "./components/map/ProvinceConsumptionMap";
import Grid from "./components/Grid";
import MainMap from "./components/map/MainMap";
import TestMap from "./components/map/testMap";



function SidePanelMock() {
  return (
    <div>
      <h3>Map panel</h3>
      <p>Here we will put Layers / Legend etc.</p>
    </div>
  );
}
export type ProvinceProps = {
  DEN_UTS: string;
  COD_PROV: number;
  CONS_ANNO: number;
};
function App() {
  return (
    <Grid
      side={<SidePanelMock />}
      map={<MainMap />}
    />
  );
}
export default App;