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

let productionChart = null;
let sufficiencyChart = null;

function updateCharts(data) {
  const months = data.months || [];

  // Clear old chart if exists
  if (productionChart) productionChart.destroy();
  if (sufficiencyChart) sufficiencyChart.destroy();

  const productionCtx = document.getElementById("chartProductionConsumption").getContext("2d");
  const sufficiencyCtx = document.getElementById("chartSelfSufficiency").getContext("2d");

  // Determine chart type
  if (data.consumption) {
    // Type: CONSUMPTION
    productionChart = new Chart(productionCtx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          { label: "Residential", data: data.residential, backgroundColor: "#4ade80" },
          { label: "Industrial", data: data.industrial, backgroundColor: "#facc15" },
          { label: "Commercial", data: data.commercial, backgroundColor: "#60a5fa" },
          { label: "Agricultural", data: data.agricultural, backgroundColor: "#f87171" }
        ]
      }
    });

  } else if (data.production) {
    // Type: PRODUCTION
    productionChart = new Chart(productionCtx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            label: `Production (${document.getElementById("energyType").value})`,
            data: data.production,
            backgroundColor: "#38bdf8"
          }
        ]
      }
    });

  } else if (data.future) {
    // Type: FUTURE PRODUCTION
    productionChart = new Chart(productionCtx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            label: `Future (${document.getElementById("energyType").value})`,
            data: data.future,
            backgroundColor: "#a78bfa"
          }
        ]
      }
    });
  }

  // For now, we'll keep Self-Sufficiency empty
  sufficiencyChart = new Chart(sufficiencyCtx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: "Self-Sufficiency (Placeholder)",
          data: months.map(() => null),
          borderColor: "#93c5fd"
        }
      ]
    }
  });
}
