import 'leaflet/dist/leaflet.css';
import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SelectedTerritoryProvider } from "./components/contexts/SelectedTerritoryContext";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SelectedTerritoryProvider>
      <App />
    </SelectedTerritoryProvider>
  </React.StrictMode>
);
