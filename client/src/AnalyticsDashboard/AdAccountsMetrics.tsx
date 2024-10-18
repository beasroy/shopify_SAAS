// AdAccountMetrics.js
import React from 'react';
import { Card, CardHeader, CardContent} from "@/components/ui/card"

// Define the type for each metric
export interface Metric {
  label: string;
  value: string;
}

// Define the props for the AdAccountMetrics component
interface AdAccountMetricsProps {
  title: string;
  metrics: Metric[];
}

// MetricCard component to render each metric using ShadCN Card
const MetricCard: React.FC<Metric> = ({ label, value }) => {
  return (
    <Card className="transition-transform transform hover:scale-105 hover:border hover:border-blue-600">
      <CardHeader className='flex flex-row items-center justify-start gap-4 pb-2'>
      <div className="flex flex-row items-center gap-2">
      <svg className="w-4 h-4" fill="#1877F2" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
        <div className="text-lg font-medium">{label}</div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold mt-2">{value}</p>
      </CardContent>
    </Card>
  );
};

const AdAccountMetrics: React.FC<AdAccountMetricsProps> = ({ title, metrics = [] }) => {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        <span>{title}</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <MetricCard key={index} label={metric.label} value={metric.value} />
        ))}
      </div>
    </section>
  );
};


export default AdAccountMetrics;
