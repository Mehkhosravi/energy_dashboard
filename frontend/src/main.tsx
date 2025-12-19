import 'leaflet/dist/leaflet.css';
import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SelectedTerritoryProvider } from "./components/contexts/SelectedTerritoryContext";
import { MapFiltersProvider } from './components/contexts/MapFiltersContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SelectedTerritoryProvider>
      <MapFiltersProvider>
        <App />
      </MapFiltersProvider>
    </SelectedTerritoryProvider>
  </React.StrictMode>
);
