// static/scripts/main.js

document.addEventListener('DOMContentLoaded', function() {

    // --- Map initialization ---
    const map = L.map('map').setView([41.9, 12.5], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
  
    const loading = document.getElementById('loading');
  
    const monthlyChart = new Chart(document.getElementById('monthlyChart').getContext('2d'), {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  
    const seasonalChart = new Chart(document.getElementById('seasonalChart').getContext('2d'), {
      type: 'line',
      data: { labels: Array.from({length: 24}, (_, i) => `${i}:00`), datasets: [] },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  
    const selfSufficiencyChart = new Chart(document.getElementById('selfSufficiencyChart').getContext('2d'), {
      type: 'scatter',
      data: { datasets: [{ label: 'Self-Sufficiency', data: [], backgroundColor: '#8e44ad' }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  
    const selfConsumptionChart = new Chart(document.getElementById('selfConsumptionChart').getContext('2d'), {
      type: 'scatter',
      data: { datasets: [{ label: 'Self-Consumption', data: [], backgroundColor: '#e67e22' }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
    
    // --- Fetching Data ---
    async function fetchChartData() {
      const comune = document.getElementById('comuneSelect').value;
      const sectors = document.querySelectorAll('.sector');
      const sector_distribution = {};
  
      let total = 0;
      sectors.forEach(slider => {
        const sector = slider.getAttribute('data-sector');
        const value = parseInt(slider.value) || 0;
        total += value;
        sector_distribution[sector] = value;
      });
  
      if (total > 100) {
        alert('Total sector distribution exceeds 100%. Please adjust sliders.');
        return;
      }
  
      const actual_sources = Array.from(document.querySelectorAll('.checkboxes input[type=checkbox]:checked'))
        .filter(cb => cb.closest('.section').querySelector('h3').innerText.includes('Actual'))
        .map(cb => cb.value);
  
      const future_sources = Array.from(document.querySelectorAll('.checkboxes input[type=checkbox]:checked'))
        .filter(cb => cb.closest('.section').querySelector('h3').innerText.includes('Future'))
        .map(cb => cb.value);
  
      loading.style.display = 'block';
  
      try {
        const response = await fetch('/api/get_chart_data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comune, sector_distribution, actual_sources, future_sources })
        });
  
        if (!response.ok) {
          let errorText = 'Server error';
          try {
            const error = await response.json();
            errorText = error.error || errorText;
          } catch (e) {}
          alert(errorText);
          return;
        }
  
        const data = await response.json();
        updateCharts(data);
  
      } catch (error) {
        console.error(error);
        alert('Network error: please check your connection or server status.');
      } finally {
        loading.style.display = 'none';
      }
    }
    // --- Update Charts ---
    function updateCharts(data) {
      if (data.months.length === 0) {
        alert('No data available for the selected options.');
      }
  
      monthlyChart.data.labels = data.months;
      monthlyChart.data.datasets = [
        { label: 'Consumption', data: data.consumption, backgroundColor: '#d97e73' },
        { label: 'Actual Production', data: data.actual_production, backgroundColor: '#9bc868' },
        { label: 'Future Production', data: data.future_production, backgroundColor: '#6dc2d9' }
      ];
      monthlyChart.update();
  
      seasonalChart.data.datasets = [];
      data.seasonal_hours.forEach(season => {
        seasonalChart.data.datasets.push({
          label: `${season.season} Weekday Consumption`,
          data: season.weekday_consumption,
          borderColor: randomColor(),
          fill: false
        });
        seasonalChart.data.datasets.push({
          label: `${season.season} Weekday Production`,
          data: season.weekday_actual,
          borderColor: randomColor(),
          fill: true,
          backgroundColor: 'rgba(46, 204, 113, 0.2)'
        });
      });
      seasonalChart.update();
  
      selfSufficiencyChart.data.datasets[0].data = data.self_sufficiency;
      selfSufficiencyChart.update();
  
      selfConsumptionChart.data.datasets[0].data = data.self_consumption;
      selfConsumptionChart.update();
    }
    // --- Random Color Generator ---
    function randomColor() {
      const colors = ['#3498db', '#2ecc71', '#e67e22', '#9b59b6', '#1abc9c', '#f1c40f', '#e74c3c'];
      return colors[Math.floor(Math.random() * colors.length)];
    }
  
    // Attach event listeners
    document.getElementById('comuneSelect').addEventListener('change', fetchChartData);
    document.querySelectorAll('.sector, .checkboxes input[type=checkbox]').forEach(input => {
      input.addEventListener('change', fetchChartData);
    });
  
    // Initial fetch
    fetchChartData();
  
  });
  