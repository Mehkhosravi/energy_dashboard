$(document).ready(function () {
  $('#comuneSelect').select2(); // Make the comune dropdown searchable

  if (typeof chartData !== 'undefined') {
    const ctx = document.getElementById('comuneChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartData.labels,
        datasets: [{
          label: 'Energy Value',
          data: chartData.values,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
});
