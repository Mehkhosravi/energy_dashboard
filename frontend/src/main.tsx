import 'leaflet/dist/leaflet.css';
import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SelectedProvinceProvider } from './components/contexts/SelectedProvinceContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SelectedProvinceProvider>
      <App />
    </SelectedProvinceProvider>
  </React.StrictMode>
);
