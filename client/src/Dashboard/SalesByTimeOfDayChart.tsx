import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

interface SalesByTimeOfDayChartProps {
  data: { hour: number; sales: number }[];
}

const SalesByTimeOfDayChart: React.FC<SalesByTimeOfDayChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="hour"
          label={{ value: 'Hour of Day', position: 'insideBottom', offset: -10 }}
          tickFormatter={(hour) => `${hour}:00`}
        />
        <YAxis
          label={{ value: 'Sales (₹)', angle: -90, position: 'insideLeft', offset: 15 }}
        />
        <Tooltip
          formatter={(value) => [`₹${value}`, 'Sales']}
          labelFormatter={(hour) => `Time: ${hour}:00 - ${(hour + 1) % 24}:00`}
        />
        <Bar dataKey="sales" fill="#8884d8" name="Sales" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default SalesByTimeOfDayChart;
