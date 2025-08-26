// Chart.js setup function - only call this from client components
export function setupChartJS() {
  if (typeof window === 'undefined') {
    return; // Don't run on server
  }

  // Dynamic imports to avoid server-side execution
  Promise.all([
    import('chart.js'),
    import('chartjs-adapter-date-fns' as any),
    import('chartjs-plugin-datalabels')
  ]).then(([chartJS, dateAdapter, dataLabels]) => {
    const { Chart: ChartJS, LinearScale, PointElement, Tooltip, Legend, TimeScale, ArcElement, CategoryScale, LogarithmicScale, BarElement, LineElement, Title } = chartJS;
    
    ChartJS.register(LinearScale, PointElement, Tooltip, Legend, TimeScale, ArcElement, CategoryScale, LogarithmicScale, BarElement, LineElement, Title, dataLabels.default);
  }).catch(error => {
    console.error('Failed to load Chart.js:', error);
  });
} 