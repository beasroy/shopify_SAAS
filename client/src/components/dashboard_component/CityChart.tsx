import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';

//  interface for city data
interface CityData {
  City: string;
  Visitors: string; 
}


const getTopCities = (data: CityData[]) => {
  return data
    .map(item => ({ city: item.City, visitors: parseInt(item.Visitors, 10) }))
    .filter(item => !isNaN(item.visitors)) // Filtering out invalid entries
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

  const maxRate = Math.max(...topCities.map(entry => entry.visitors)); 

  return (
    <ResponsiveContainer width="100%" height={300}>
      {topCities.length > 0 ? (
        <BarChart
          data={topCities}
          layout="vertical"
          margin={{ right: 30, left: 35, bottom: 30 }}
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
              const { visitors } = props.payload; 
              return <rect {...props} fill={getBarColor(visitors, maxRate)} />; 
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
