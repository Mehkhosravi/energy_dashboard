document.addEventListener("DOMContentLoaded", () => {
  const levelSelect = document.getElementById("levelSelect");
  const areaSelect = document.getElementById("areaSelect");

  // ✅ Initialize the map once
  const map = L.map('map').setView([41.9, 12.5], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  let currentLayer = null; // will hold the active layer

  // ✅ Load a default comune (Torino)
  loadGeometry("comune", "Torino");

  // ✅ When level changes → update area names
  levelSelect.addEventListener("change", () => {
    const level = levelSelect.value;
    areaSelect.innerHTML = `<option value="">-- Loading... --</option>`;
    areaSelect.disabled = true;

    if (!level) {
      areaSelect.innerHTML = `<option value="">-- Select a level first --</option>`;
      return;
    }

    fetch(`/api/get_names/${level}`)
      .then(res => res.json())
      .then(data => {
        areaSelect.innerHTML = `<option value="">-- Choose --</option>`;
        data.forEach(name => {
          const opt = document.createElement("option");
          opt.value = name;
          opt.textContent = name;
          areaSelect.appendChild(opt);
        });
        areaSelect.disabled = false;
      })
      .catch(err => {
        console.error("Error fetching area names:", err);
        areaSelect.innerHTML = `<option value="">-- Failed to load data --</option>`;
      });
  });

  // ✅ When user selects an area → update map
  areaSelect.addEventListener("change", () => {
    const level = levelSelect.value;
    const areaName = areaSelect.value;
    if (areaName) {
      loadGeometry(level, areaName);
    }
  });

  // ✅ Load GeoJSON based on level + name
  function loadGeometry(level, name) {
    fetch(`/api/map_data/${level}/${name}`)
      .then(response => {
        console.log("GeoJSON response status:", response.status);
        return response.json();
      })
      .then(data => {
        console.log("GeoJSON data received:", data);

        if (!data || !data.features || data.features.length === 0) {
          alert("No valid GeoJSON features found.");
          return;
        }

        if (currentLayer) {
          map.removeLayer(currentLayer);
        }

        currentLayer = L.geoJSON(data, {
          style: {
            color: '#2563eb',
            fillColor: '#93c5fd',
            fillOpacity: 0.4
          }
        }).addTo(map);

        map.fitBounds(currentLayer.getBounds());
      })
      .catch(error => {
        console.error("Map loading error:", error);
        alert("Failed to load map for the selected area.");
      });
  }
});
