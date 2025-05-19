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
        
        // Re-initializing Select2 after populating dropdown
        if ($(areaSelect).hasClass("select2-hidden-accessible")) {
          $(areaSelect).select2("destroy");
        }
        $(areaSelect).select2({
          placeholder: "Search area...",
          allowClear: true
        });
      })
      .catch(err => {
        console.error("Error fetching area names:", err);
        areaSelect.innerHTML = `<option value="">-- Failed to load data --</option>`;
      });
  });

  // ✅ When user selects an area → update map
  $('#areaSelect').on('change', function () {
    const level = levelSelect.value;
    const areaName = $(this).val();  // Select2-safe value
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

        if (!data?.features || data.features.length === 0) {
          alert("No valid GeoJSON features found.");
          return;
        }

        if (currentLayer) {
          map.removeLayer(currentLayer);
        }

        let selectedLayer = null;
        currentLayer = L.geoJSON(data, {
          style: {
            color: '#2563eb',
            fillColor: '#93c5fd',
            fillOpacity: 0.4,
            weight: 1
          },

          onEachFeature: function (feature, layer) {
            const name = feature.properties.comune || "UnKnown";
            const province = feature.properties.province || "—";
            const region = feature.properties.region || "—";

            layer.bindPopup(`<strong>${name}</strong><br>Region: ${region}<br>Province: ${province}`);

            layer.on({
              mouseover: (e) => {
                const l = e.target;
                l.setStyle({ weight: 3, color: "#1d4ed8", fillOpacity: 0.6 });
              },
              mouseout: (e) => {
                if (e.target !== selectedLayer) {
                  currentLayer.resetStyle(e.target);
                }
              },
              click: (e) => {
                if (selectedLayer) {
                  currentLayer.resetStyle(selectedLayer);
                }
                selectedLayer = e.target;
                selectedLayer.setStyle({
                  color: "#10b981",
                  fillColor: "#a7f3d0",
                  fillOpacity: 0.7
                });
                selectedLayer.openPopup();
              }
            });
          }

        }).addTo(map);


        map.fitBounds(currentLayer.getBounds());
        selectedComune = name.toLowerCase(); // share selected area globally
        updateChartWithFilters(); // trigger filter-based chart rendering

        // Load chart data
        fetch(`/api/chart_data/${level}/${name}`)
          .then(res => res.json())
          .then(data => updateCharts(data))
          .catch(err => console.error("Failed to load chart data:", err));
      })
      .catch(error => {
        console.error("Map loading error:", error);
        alert("Failed to load map for the selected area.");
      });
  }
});

function updateCharts(data) {
  const ctx1 = document.getElementById("chartProductionConsumption").getContext("2d");

  if (window.productionChart) window.productionChart.destroy();

  const labels = data.months;

  let datasets = [];

  if (data.residential) {
    // This is a consumption dataset
    datasets = [
      {
        label: "Residential",
        data: data.residential,
        backgroundColor: "rgba(34, 197, 94, 0.6)"
      },
      {
        label: "Industrial",
        data: data.industrial,
        backgroundColor: "rgba(59, 130, 246, 0.6)"
      },
      {
        label: "Commercial",
        data: data.commercial,
        backgroundColor: "rgba(234, 179, 8, 0.6)"
      },
      {
        label: "Agricultural",
        data: data.agricultural,
        backgroundColor: "rgba(239, 68, 68, 0.6)"
      }
    ];
  } else if (data.production) {
    // This is a single production dataset
    datasets = [
      {
        label: "Actual Production",
        data: data.production,
        backgroundColor: "rgba(59, 130, 246, 0.6)"
      }
    ];
  } else if (data.future) {
    // This is a future production dataset
    datasets = [
      {
        label: "Future Production",
        data: data.future,
        backgroundColor: "rgba(16, 185, 129, 0.6)"
      }
    ];
  }

  window.productionChart = new Chart(ctx1, {
    type: "bar",
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true
    }
  });
}
