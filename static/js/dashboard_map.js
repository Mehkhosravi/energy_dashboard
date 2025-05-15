document.addEventListener('DOMContentLoaded', () => {
  const comuneName = "Torino"; // I have to make dynamic later

  fetch(`/api/map_data/${comuneName}`)
    .then(response => response.json())
    .then(data => {
      const map = L.map('map');

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      const geoLayer = L.geoJSON(data);
      geoLayer.addTo(map);

      map.fitBounds(geoLayer.getBounds());
    })
    .catch(error => {
      console.error("Map loading error:", error);
      alert("Failed to load map for the selected comune.");
    });
});
