// Chart.js setup function - only call this from client components
let isSetup = false;
let setupPromise: Promise<void> | null = null;
let setupStartTime: number | null = null;
let dataLabelsAvailable = false;

export function isChartJSSetup(): boolean {
  console.log('isChartJSSetup called, returning:', isSetup);
  return isSetup;
}

export function isDataLabelsAvailable(): boolean {
  return dataLabelsAvailable;
}

export function setupChartJS(): Promise<void> {
  console.log('setupChartJS called, isSetup:', isSetup, 'setupPromise:', !!setupPromise);
  
  if (typeof window === 'undefined') {
    console.log('setupChartJS: Server-side, returning resolved promise');
    return Promise.resolve(); // Don't run on server
  }

  if (isSetup) {
    console.log('setupChartJS: Already set up, returning resolved promise');
    return Promise.resolve();
  }

  if (setupPromise) {
    console.log('setupChartJS: Setup already in progress, returning existing promise');
    return setupPromise;
  }

  // Track setup start time for debugging
  setupStartTime = Date.now();
  console.log('setupChartJS: Starting Chart.js setup...');
  
  setupPromise = Promise.all([
    import('chart.js').catch(error => {
      console.error('setupChartJS: Failed to import chart.js:', error);
      throw new Error(`Failed to load Chart.js: ${error.message}`);
    }),
    import('chartjs-adapter-date-fns' as any).catch(error => {
      console.error('setupChartJS: Failed to import chartjs-adapter-date-fns:', error);
      throw new Error(`Failed to load date adapter: ${error.message}`);
    }),
    // Make data labels plugin optional - if it fails, we'll continue without it
    import('chartjs-plugin-datalabels').catch(error => {
      console.warn('setupChartJS: Failed to import chartjs-plugin-datalabels, continuing without data labels:', error);
      return null; // Return null instead of throwing error
    })
  ]).then(([chartJS, dateAdapter, dataLabels]) => {
    console.log('setupChartJS: Chart.js modules loaded successfully, registering components...');
    console.log('setupChartJS: chartJS:', !!chartJS, 'dateAdapter:', !!dateAdapter, 'dataLabels:', !!dataLabels);
    
    const { Chart: ChartJS, LinearScale, PointElement, Tooltip, Legend, TimeScale, ArcElement, CategoryScale, LogarithmicScale, BarElement, LineElement, Title } = chartJS;
    
    try {
      console.log('setupChartJS: Registering scales...');
      // Register scales first
      ChartJS.register(LinearScale);
      ChartJS.register(CategoryScale);
      ChartJS.register(LogarithmicScale);
      ChartJS.register(TimeScale);
      
      console.log('setupChartJS: Registering elements...');
      // Then register elements
      ChartJS.register(PointElement);
      ChartJS.register(BarElement);
      ChartJS.register(LineElement);
      ChartJS.register(ArcElement);
      
      console.log('setupChartJS: Registering plugins...');
      // Then register plugins
      ChartJS.register(Tooltip);
      ChartJS.register(Legend);
      ChartJS.register(Title);
      
      // Only register data labels plugin if it loaded successfully
      if (dataLabels) {
        console.log('setupChartJS: Registering data labels plugin...');
        ChartJS.register(dataLabels.default);
        dataLabelsAvailable = true;
      } else {
        console.log('setupChartJS: Skipping data labels plugin registration (not available)');
        dataLabelsAvailable = false;
      }
      
      const setupTime = Date.now() - (setupStartTime || 0);
      console.log(`setupChartJS: Chart.js setup complete in ${setupTime}ms`);
      isSetup = true;
    } catch (error) {
      console.error('setupChartJS: Failed to register Chart.js components:', error);
      setupPromise = null;
      setupStartTime = null;
      throw error;
    }
  }).catch(error => {
    console.error('setupChartJS: Failed to load Chart.js:', error);
    setupPromise = null; // Reset on error so we can retry
    setupStartTime = null;
    throw error;
  });

  return setupPromise;
}

// Add a function to check if setup is in progress
export function isChartJSSetupInProgress(): boolean {
  const inProgress = setupPromise !== null && !isSetup;
  console.log('isChartJSSetupInProgress called, returning:', inProgress);
  return inProgress;
}

// Add a function to get setup status for debugging
export function getChartJSSetupStatus(): { isSetup: boolean; isInProgress: boolean; setupTime?: number } {
  return {
    isSetup,
    isInProgress: isChartJSSetupInProgress(),
    setupTime: setupStartTime ? Date.now() - setupStartTime : undefined
  };
}

// Add a function to reset setup state for debugging
export function resetChartJSSetup(): void {
  console.log('resetChartJSSetup: Resetting Chart.js setup state');
  isSetup = false;
  setupPromise = null;
  setupStartTime = null;
  dataLabelsAvailable = false;
} 