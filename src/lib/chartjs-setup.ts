import { Chart as ChartJS, LinearScale, PointElement, Tooltip, Legend, TimeScale, ArcElement, CategoryScale, LogarithmicScale, BarElement, LineElement, Title } from 'chart.js';
import 'chartjs-adapter-date-fns';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend, TimeScale, ArcElement, CategoryScale, LogarithmicScale, BarElement, LineElement, Title, ChartDataLabels); 