let selectedComune = null; // Global variable to store selected comune

document.addEventListener("DOMContentLoaded", () => {
  const dataTypeSelect = document.getElementById("dataType");
  const energyTypeGroup = document.getElementById("energyTypeGroup");
  const energyTypeSelect = document.getElementById("energyType");
  const timeFilter = document.getElementById("timeFilter");
  const monthGroup = document.getElementById("monthSelectorGroup");
  const seasonGroup = document.getElementById("seasonSelectorGroup");

  // Initialize Choices.js for monthSelect
  const monthSelect = document.getElementById("monthSelect");
  if (monthSelect) {
    new Choices(monthSelect, {
      removeItemButton: true,
      shouldSort: false,
      placeholder: true,
      placeholderValue: 'Select months'
    });
  }

  // Initialize Virtual Select for yearSelect
  VirtualSelect.init({
    ele: '#yearSelect',
    multiple: true,
    search: true,
    placeholder: 'Select year(s)',
    options: Array.from({ length: 51 }, (_, i) => {
      const year = 2000 + i;
      return { label: `${year}`, value: `${year}` };
    })
  });

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
