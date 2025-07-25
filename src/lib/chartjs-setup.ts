import { Chart as ChartJS, LinearScale, PointElement, Tooltip, Legend, TimeScale, ArcElement, CategoryScale, LogarithmicScale } from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend, TimeScale, ArcElement, CategoryScale, LogarithmicScale); 