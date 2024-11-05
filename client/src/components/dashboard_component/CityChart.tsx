import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';

// Define the interface for city data
interface CityData {
  City: string;
  Visitors: string; // Assuming visitors is a string based on your provided data
}

// Function to get top 5 cities based on visitors from the data
const getTopCities = (data: CityData[]) => {
  return data
    .map(item => ({ city: item.City, visitors: parseInt(item.Visitors, 10) }))
    .filter(item => !isNaN(item.visitors)) // Filter out invalid entries
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 5);
};

interface TopCitiesBarChartProps {
  cityData: CityData[];
}


const getBarColor = (value: number, max: number) => {
  const blueColors = ['#E0F7FA', '#B2EBF2', '#80DEEA', '#4DD0E1', '#00ACC1']; 
  const index = Math.floor((value / max) * (blueColors.length - 1)); 
  return blueColors[index]; 
};


const TopCitiesBarChart: React.FC<TopCitiesBarChartProps> = ({ cityData }) => {
  const topCities = getTopCities(cityData);

  const maxRate = Math.max(...topCities.map(entry => entry.visitors)); // Use topCities instead of cityData

  return (
    <ResponsiveContainer width="100%" height={300}>
      {topCities.length > 0 ? (
        <BarChart
          data={topCities}
          layout="vertical"
          margin={{ right: 30, left: 35, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" label={{ value: 'Visitors', position: 'insideBottom', offset: -5 }} />
          <YAxis dataKey="city" type="category" />
          <Tooltip 
            formatter={(value) => [value, 'Visitors']}
            contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
          />
          <Legend verticalAlign="top" height={36} />
          <Bar 
            dataKey="visitors" 
            name="Visitors" 
            barSize={20} 
            fill="#00ACC1" 
            shape={(props:any) => {
              const { visitors } = props.payload; // Access visitors from the payload
              return <rect {...props} fill={getBarColor(visitors, maxRate)} />; // Use getBarColor to determine the fill color
            }}
          />
        </BarChart>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">No data available. Please set up Google Analytics for this data.</p>
        </div>
      )}
    </ResponsiveContainer>
  );
};

export default TopCitiesBarChart;
