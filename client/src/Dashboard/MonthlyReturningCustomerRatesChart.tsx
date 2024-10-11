import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface MonthlyReturningCustomerRatesChartProps {
  data: { month: string; returningCustomerRate: number }[];
}

const MonthlyReturningCustomerRatesChart: React.FC<MonthlyReturningCustomerRatesChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 10 }}>
        <XAxis dataKey="month" label={{ value: 'Month', position: 'insideBottom', offset: -10 }} />
        <YAxis label={{ value: 'Rate (%)', angle: -90, position: 'insideLeft', offset: 20 }} />
        <Tooltip formatter={(value) => [`${value}%`, 'Returning Customer Rate']} />
        <Line type="monotone" dataKey="returningCustomerRate" stroke="#82ca9d" name="Returning Customer Rate (%)" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default MonthlyReturningCustomerRatesChart;
