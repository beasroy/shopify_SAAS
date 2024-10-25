import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface MonthlyReturningCustomerRatesChartProps {
  data: { month: string; returningCustomerRate: number }[];
}

// Function to determine bar color based on value
const getBarColor = (value: number, max: number, min: number) => {
  if (value === max) return '#006400'; // Deep green for the maximum
  if (value === min) return '#90ee90'; // Light green for the minimum
  return '#82ca9d'; // Default green for others
};

// Function to convert "202410" to "October"
const formatMonth = (yearMonth: string) => {
  const monthMap: { [key: string]: string } = {
    '01': 'January',
    '02': 'February',
    '03': 'March',
    '04': 'April',
    '05': 'May',
    '06': 'June',
    '07': 'July',
    '08': 'August',
    '09': 'September',
    '10': 'October',
    '11': 'November',
    '12': 'December'
  };

  const month = yearMonth.slice(4, 6); // Extract the last two characters as month
  return monthMap[month] || 'Unknown'; // Return month name or 'Unknown' if invalid
};

const MonthlyReturningCustomerRatesChart: React.FC<MonthlyReturningCustomerRatesChartProps> = ({ data }) => {

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <p>No data available. Please set up Google Analytics for this data.</p>
      </div>
    );
  }
  // Calculate max and min values
  const maxRate = Math.max(...data.map(entry => entry.returningCustomerRate));
  const minRate = Math.min(...data.map(entry => entry.returningCustomerRate));

  // Convert yearMonth to readable format
  const formattedData = data.map(entry => ({
    ...entry,
    month: formatMonth(entry.month), // Convert "202410" to "October"
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 10 }}>
        <XAxis 
          dataKey="month" 
          label={{ value: 'Month', position: 'insideBottom', offset: 0 }} // Adjusted position
        />
        <YAxis 
          label={{ value: 'Return Rate (%)', angle: -90, position: 'insideLeft', offset: 20 }} // Adjusted angle and position
        />
        <Tooltip formatter={(value) => [`${value}%`, 'Returning Customer Rate']} />
        <Bar dataKey="returningCustomerRate">
          {formattedData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={getBarColor(entry.returningCustomerRate, maxRate, minRate)} 
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MonthlyReturningCustomerRatesChart;
