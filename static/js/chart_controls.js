let selectedComune = null; // shared between modules

document.addEventListener("DOMContentLoaded", () => {
  const dataTypeSelect = document.getElementById("dataType");
  const energyTypeGroup = document.getElementById("energyTypeGroup");
  const energyTypeSelect = document.getElementById("energyType");
  const timeFilter = document.getElementById("timeFilter");
  const monthGroup = document.getElementById("monthSelectorGroup");
  const seasonGroup = document.getElementById("seasonSelectorGroup");

  if (dataTypeSelect) {
    dataTypeSelect.addEventListener("change", () => {
      const selected = dataTypeSelect.value;
      if (energyTypeGroup) {
        if (selected === "production" || selected === "future") {
          energyTypeGroup.classList.remove("hidden");
        } else {
          energyTypeGroup.classList.add("hidden");
        }
      }
      updateChartWithFilters();
    });
  }

  if (energyTypeSelect) {
    energyTypeSelect.addEventListener("change", () => {
      updateChartWithFilters();
    });
  }

  const downloadChartBtn = document.getElementById("downloadChart");
  if (downloadChartBtn) {
    downloadChartBtn.addEventListener("click", () => {
      const canvas = document.getElementById("chartProductionConsumption");
      if (!canvas) return;
      const scale = 2;
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width * scale;
      tempCanvas.height = canvas.height * scale;
      const ctx = tempCanvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.drawImage(canvas, 0, 0);
      const url = tempCanvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.download = "energy_chart_hd.png";
      link.href = url;
      link.click();
    });
  }

  const downloadMapBtn = document.getElementById("downloadMap");
  if (downloadMapBtn) {
    downloadMapBtn.addEventListener("click", () => {
      const mapContainer = document.getElementById("map");
      if (!mapContainer) return;
      html2canvas(mapContainer).then(canvas => {
        const link = document.createElement("a");
        link.download = "selected_map.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
      });
    });
  }

  if (timeFilter) {
    timeFilter.addEventListener("change", () => {
      const selected = timeFilter.value;
      if (monthGroup) monthGroup.classList.add("hidden");
      if (seasonGroup) seasonGroup.classList.add("hidden");
      if (selected === "monthly" && monthGroup) {
        monthGroup.classList.remove("hidden");
      } else if (selected === "seasonal" && seasonGroup) {
        seasonGroup.classList.remove("hidden");
      }
      updateChartWithFilters();
    });
  }
});

function updateChartWithFilters() {
  if (!selectedComune) return;

  const dataType = document.getElementById("dataType")?.value || "consumption";
  const energyType = document.getElementById("energyType")?.value || "";
  const timeType = document.getElementById("timeFilter")?.value || "all";
  const month = document.getElementById("monthSelect")?.value || "";
  const season = document.getElementById("seasonSelect")?.value || "";

  let url = `/api/chart_data/${dataType}/${selectedComune}`;
  let params = [];

  if (timeType && timeType !== "all") params.push(`time=${timeType}`);
  if (timeType === "monthly" && month) params.push(`month=${month}`);
  if (timeType === "seasonal" && season) params.push(`season=${season}`);
  if ((dataType === "production" || dataType === "future") && energyType) {
    params.push(`source=${energyType}`);
  }

  if (params.length > 0) {
    url += "?" + params.join("&");
  }

  fetch(url)
    .then(res => res.json())
    .then(data => {
      updateCharts(data);
    })
    .catch(err => console.error("Chart fetch failed:", err));
}

let productionChart = null;
let sufficiencyChart = null;

function updateCharts(data) {
  const months = data.months || [];

  if (productionChart) productionChart.destroy();
  if (sufficiencyChart) sufficiencyChart.destroy();

  const productionCtx = document.getElementById("chartProductionConsumption")?.getContext("2d");
  const sufficiencyCtx = document.getElementById("chartSelfSufficiency")?.getContext("2d");
  if (!productionCtx || !sufficiencyCtx) return;

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 20 },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { size: 14, weight: 'bold' },
          color: '#374151'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        titleFont: { size: 14 },
        bodyFont: { size: 13 }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 12 }, color: '#4b5563' }
      },
      y: {
        grid: { color: '#e5e7eb' },
        ticks: { font: { size: 12 }, color: '#4b5563' }
      }
    }
  };

  if (data.residential) {
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
      },
      options: commonOptions
    });
  } else if (data.production) {
    productionChart = new Chart(productionCtx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          label: `Production (${document.getElementById("energyType")?.value})`,
          data: data.production,
          backgroundColor: "#38bdf8"
        }]
      },
      options: commonOptions
    });
  } else if (data.future) {
    productionChart = new Chart(productionCtx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          label: `Future (${document.getElementById("energyType")?.value})`,
          data: data.future,
          backgroundColor: "#a78bfa"
        }]
      },
      options: commonOptions
    });
  }

  sufficiencyChart = new Chart(sufficiencyCtx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: "Self-Sufficiency (Placeholder)",
        data: months.map(() => null),
        borderColor: "#93c5fd"
      }]
    },
    options: commonOptions
  });
}
