import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';

// Define the interface for city data
interface CityData {
  city: string;
  visitors: string; // Assuming visitors is a string based on your provided data
}

// Function to get top 5 cities based on visitors from the data
const getTopCities = (data: CityData[]) => {
  // Convert visitors to numbers and sort the data based on the highest visitors
  return data
    .map(item => ({ city: item.city, visitors: parseInt(item.visitors, 10) })) // Convert visitors to integer
    .sort((a, b) => b.visitors - a.visitors) // Sort by visitors in descending order
    .slice(0, 5); // Get top 5
};

interface TopCitiesLineChartProps {
  cityData: CityData[];
}

const TopCitiesLineChart: React.FC<TopCitiesLineChartProps> = ({ cityData }) => {
  const topCities = getTopCities(cityData);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={topCities}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="city" label={{ value: 'City', position: 'insideBottom', offset: -5 }} />
        <YAxis label={{ value: 'Visitors', angle: -90, position: 'insideLeft' }} />
        <Tooltip formatter={(value) => [value, 'Visitors']} />
        <Legend />
        <Line type="monotone" dataKey="visitors" stroke="#8884d8" activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TopCitiesLineChart;
