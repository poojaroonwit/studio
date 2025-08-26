// Chart.js setup function - only call this from client components
let isSetup = false;
let setupPromise: Promise<void> | null = null;

export function isChartJSSetup(): boolean {
  return isSetup;
}

export function setupChartJS(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve(); // Don't run on server
  }

  if (isSetup) {
    return Promise.resolve();
  }

  if (setupPromise) {
    return setupPromise;
  }

  console.log('Setting up Chart.js...');
  
  setupPromise = Promise.all([
    import('chart.js'),
    import('chartjs-adapter-date-fns' as any),
    import('chartjs-plugin-datalabels')
  ]).then(([chartJS, dateAdapter, dataLabels]) => {
    console.log('Chart.js modules loaded, registering components...');
    
    const { Chart: ChartJS, LinearScale, PointElement, Tooltip, Legend, TimeScale, ArcElement, CategoryScale, LogarithmicScale, BarElement, LineElement, Title } = chartJS;
    
    try {
      // Register scales first
      ChartJS.register(LinearScale);
      ChartJS.register(CategoryScale);
      ChartJS.register(LogarithmicScale);
      ChartJS.register(TimeScale);
      
      // Then register elements
      ChartJS.register(PointElement);
      ChartJS.register(BarElement);
      ChartJS.register(LineElement);
      ChartJS.register(ArcElement);
      
      // Then register plugins
      ChartJS.register(Tooltip);
      ChartJS.register(Legend);
      ChartJS.register(Title);
      ChartJS.register(dataLabels.default);
      
      console.log('Chart.js setup complete');
      isSetup = true;
    } catch (error) {
      console.error('Failed to register Chart.js components:', error);
      setupPromise = null;
      throw error;
    }
  }).catch(error => {
    console.error('Failed to load Chart.js:', error);
    setupPromise = null; // Reset on error so we can retry
    throw error;
  });

  return setupPromise;
} 