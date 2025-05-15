fetch(`/api/map_data/Torino`)
  .then(response => {
    console.log("GeoJSON response status:", response.status);
    return response.json();
  })
  .then(data => {
    console.log("GeoJSON data received:", data);

    const map = L.map('map').setView([41.9, 12.5], 6); // Default to Italy center

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    if (!data || !data.features || data.features.length === 0) {
      alert("No valid GeoJSON features found.");
      return;
    }

    const geoLayer = L.geoJSON(data).addTo(map);
    map.fitBounds(geoLayer.getBounds());
  })
  .catch(error => {
    console.error("Map loading error:", error);
    alert("Failed to load map for the selected comune.");
  });
