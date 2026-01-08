"use client";

import React, { useState, useRef, useEffect } from 'react';
import { TiptapEditor } from '@/components/ui/wysiwyg-editors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { useChartSetup } from '@/hooks/use-chart-setup';
import { BarChart3, Plus, X, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/security';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ChartData {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  title: string;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
    }>;
  };
}

interface GenerativeAICanvasProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function GenerativeAICanvas({
  value,
  onChange,
  placeholder = "Start writing or add charts...",
  className
}: GenerativeAICanvasProps) {
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [showChartDialog, setShowChartDialog] = useState(false);
  const [newChartType, setNewChartType] = useState<'bar' | 'line' | 'pie' | 'doughnut'>('bar');
  const [newChartTitle, setNewChartTitle] = useState('');
  const chartSetupReady = useChartSetup();

  // Parse charts from HTML content
  useEffect(() => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(value || '', 'text/html');
      const chartElements = doc.querySelectorAll('[data-chart-id]');
      const parsedCharts: ChartData[] = [];
      
      chartElements.forEach((el) => {
        const chartId = el.getAttribute('data-chart-id');
        const chartType = el.getAttribute('data-chart-type') as ChartData['type'];
        const chartTitle = el.getAttribute('data-chart-title') || '';
        const chartDataStr = el.getAttribute('data-chart-data');
        
        if (chartId && chartType && chartDataStr) {
          try {
            const chartData = JSON.parse(chartDataStr);
            parsedCharts.push({
              id: chartId,
              type: chartType,
              title: chartTitle,
              data: chartData
            });
          } catch (e) {
            console.error('Error parsing chart data:', e);
          }
        }
      });
      
      setCharts(parsedCharts);
    } catch (error) {
      console.error('Error parsing charts from content:', error);
    }
  }, [value]);

  // Update HTML content when charts change
  const updateContentWithCharts = (updatedCharts: ChartData[], htmlContent: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent || '<p></p>', 'text/html');
      
      // Remove existing chart elements
      doc.querySelectorAll('[data-chart-id]').forEach(el => el.remove());
      
      // Add updated charts
      updatedCharts.forEach(chart => {
        const chartDiv = doc.createElement('div');
        chartDiv.setAttribute('data-chart-id', chart.id);
        chartDiv.setAttribute('data-chart-type', chart.type);
        chartDiv.setAttribute('data-chart-title', chart.title);
        chartDiv.setAttribute('data-chart-data', JSON.stringify(chart.data));
        chartDiv.className = 'chart-container my-4 p-4 border rounded-lg bg-muted/30';
        
        // Use textContent for title to prevent XSS, then sanitize the HTML structure
        const titleDiv = doc.createElement('div');
        titleDiv.className = 'text-sm font-medium mb-2';
        titleDiv.textContent = chart.title; // Safe: textContent escapes HTML
        
        const placeholderDiv = doc.createElement('div');
        placeholderDiv.className = 'chart-placeholder';
        placeholderDiv.textContent = 'Chart will be rendered here';
        
        chartDiv.appendChild(titleDiv);
        chartDiv.appendChild(placeholderDiv);
        
        doc.body.appendChild(chartDiv);
      });
      
      return doc.body.innerHTML;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating content with charts:', error);
      }
      return htmlContent;
    }
  };

  const handleAddChart = () => {
    if (!newChartTitle.trim()) {
      return;
    }

    const chartId = `chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Default sample data
    const defaultData = {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [{
        label: 'Sample Data',
        data: [12, 19, 3, 5],
        backgroundColor: newChartType === 'bar' || newChartType === 'line' 
          ? 'rgba(59, 130, 246, 0.5)'
          : ['rgba(59, 130, 246, 0.5)', 'rgba(16, 185, 129, 0.5)', 'rgba(245, 158, 11, 0.5)', 'rgba(239, 68, 68, 0.5)'],
        borderColor: newChartType === 'bar' || newChartType === 'line'
          ? 'rgba(59, 130, 246, 1)'
          : ['rgba(59, 130, 246, 1)', 'rgba(16, 185, 129, 1)', 'rgba(245, 158, 11, 1)', 'rgba(239, 68, 68, 1)'],
        borderWidth: 1
      }]
    };

    const newChart: ChartData = {
      id: chartId,
      type: newChartType,
      title: newChartTitle,
      data: defaultData
    };

    const updatedCharts = [...charts, newChart];
    setCharts(updatedCharts);
    
    // Update HTML content
    const updatedContent = updateContentWithCharts(updatedCharts, value);
    onChange(updatedContent);
    
    setShowChartDialog(false);
    setNewChartTitle('');
    setNewChartType('bar');
  };

  const handleRemoveChart = (chartId: string) => {
    const updatedCharts = charts.filter(c => c.id !== chartId);
    setCharts(updatedCharts);
    
    // Update HTML content
    const updatedContent = updateContentWithCharts(updatedCharts, value);
    onChange(updatedContent);
  };

  const handleChartDataChange = (chartId: string, newData: ChartData['data']) => {
    const updatedCharts = charts.map(c => 
      c.id === chartId ? { ...c, data: newData } : c
    );
    setCharts(updatedCharts);
    
    // Update HTML content
    const updatedContent = updateContentWithCharts(updatedCharts, value);
    onChange(updatedContent);
  };

  const renderChart = (chart: ChartData) => {
    if (!chartSetupReady) {
      return <div className="text-sm text-muted-foreground">Loading chart...</div>;
    }

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: false,
        },
      },
    };

    return (
      <div key={chart.id} className="relative group">
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="destructive"
            size="icon"
            className="h-6 w-6"
            onClick={() => handleRemoveChart(chart.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <div className="h-64">
          {chart.type === 'bar' && <Bar data={chart.data} options={chartOptions} />}
          {chart.type === 'line' && <Line data={chart.data} options={chartOptions} />}
          {chart.type === 'pie' && <Pie data={chart.data} options={chartOptions} />}
          {chart.type === 'doughnut' && <Doughnut data={chart.data} options={chartOptions} />}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Canvas Mode</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowChartDialog(true)}
          className="flex items-center gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Add Chart
        </Button>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* WYSIWYG Editor */}
        <div className="border rounded-lg">
          <TiptapEditor
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="min-h-[200px]"
            readOnly={false}
          />
        </div>

        {/* Charts */}
        {charts.length > 0 && (
          <div className="space-y-4">
            {charts.map(chart => (
              <Card key={chart.id}>
                <CardHeader>
                  <CardTitle className="text-base">{chart.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderChart(chart)}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Chart Dialog */}
      <Dialog open={showChartDialog} onOpenChange={setShowChartDialog}>
        <DialogContent className="sm:max-w-md" dialogId="add-chart-dialog">
          <DialogHeader>
            <DialogTitle>Add Chart</DialogTitle>
            <DialogDescription>
              Create a new chart to visualize your data
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="chart-title">Chart Title</Label>
              <Input
                id="chart-title"
                type="text"
                value={newChartTitle}
                onChange={(e) => setNewChartTitle(e.target.value)}
                placeholder="Enter chart title..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chart-type">Chart Type</Label>
              <Select value={newChartType} onValueChange={(value) => setNewChartType(value as ChartData['type'])}>
                <SelectTrigger id="chart-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                  <SelectItem value="doughnut">Doughnut Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChartDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddChart} disabled={!newChartTitle.trim()}>
              Add Chart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

