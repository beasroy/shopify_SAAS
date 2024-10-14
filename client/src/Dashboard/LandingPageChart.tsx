import React from 'react';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

// Define the interface for landingPage data
interface PageData {
  LandingPage: string;
  Visitors: string;
}

// Function to get top 5 Pages based on visitors from the data
const getTopLandingPages = (data: PageData[]) => {
  // Convert visitors to numbers and sort the data based on the highest visitors
  return data
    .map(item => ({
      LandingPage: item.LandingPage,// Add a short label for the legend
      Visitors: parseInt(item.Visitors, 10)
    })) // Convert visitors to integer
    .sort((a, b) => b.Visitors - a.Visitors) // Sort by visitors in descending order
    .slice(0, 5); // Get top 5
};


// Function to shorten the landing page label by removing query parameters

interface TopPagesPieChartProps {
  PageData: PageData[];
}

// Define an array of colors for the pie slices
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1'];

const TopPagesPieChart: React.FC<TopPagesPieChartProps> = ({ PageData }) => {
  const topPages = getTopLandingPages(PageData);
  const isMobileOrTablet = window.innerWidth < 768; // Check if the screen is mobile or tablet

  return (
    <div >
      <ResponsiveContainer width="98%" height={300}>
        <PieChart>
          <Tooltip formatter={(value, name) => [`${value}`, `${name}`]} />
          {!isMobileOrTablet && ( // Conditionally render the Legend
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
            />
          )}
          <Pie
            data={topPages}
            dataKey="Visitors"
            nameKey="LandingPage" // Use the shortened name for displaying on the chart
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={50}
            label
          >
            {topPages.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TopPagesPieChart;
