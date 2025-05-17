let selectedComune = null; // shared between modules

document.addEventListener("DOMContentLoaded", () => {
  const dataTypeSelect = document.getElementById("dataType");
  const energyTypeGroup = document.getElementById("energyTypeGroup");
  const energyTypeSelect = document.getElementById("energyType");

  dataTypeSelect.addEventListener("change", () => {
    const selected = dataTypeSelect.value;

    // Show energy selector only for production/future
    if (selected === "production" || selected === "future") {
      energyTypeGroup.classList.remove("hidden");
    } else {
      energyTypeGroup.classList.add("hidden");
    }

    updateChartWithFilters();
  });

  energyTypeSelect.addEventListener("change", () => {
    updateChartWithFilters();
  });
});

function updateChartWithFilters() {
  if (!selectedComune) return;

  const dataType = document.getElementById("dataType").value;
  const energyType = document.getElementById("energyType").value;

  let url = `/api/chart_data/${dataType}/${selectedComune}`;
  if (dataType === "production" || dataType === "future") {
    url += `?source=${energyType}`;
  }

  fetch(url)
    .then(res => res.json())
    .then(data => {
      updateCharts(data); // uses same chart logic
    })
    .catch(err => console.error("Chart fetch failed:", err));
}
