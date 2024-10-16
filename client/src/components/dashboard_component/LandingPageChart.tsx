import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

// Define the interface for landingPage data
interface PageData {
  LandingPage: string;
  Visitors: string;
}

// Function to get top 5 Pages based on visitors from the data
const getTopLandingPages = (data: PageData[]) => {
  return data
    .map(item => ({
      LandingPage: item.LandingPage,
      Visitors: parseInt(item.Visitors, 10),
    }))
    .sort((a, b) => b.Visitors - a.Visitors)
    .slice(0, 5);
};

interface TopPagesPieChartProps {
  PageData: PageData[];
}

// Define an array of colors for the pie slices
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1'];

const TopPagesPieChart: React.FC<TopPagesPieChartProps> = ({ PageData }) => {
  const topPages = getTopLandingPages(PageData);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div>
      <ResponsiveContainer width="100%" height={ 280}>
        <PieChart>
          <Tooltip formatter={(value, name) => [`${value}`, `${name}`]} />
          {!isMobileOrTablet && ( // Conditionally render the Legend
            <Legend layout="vertical" align="right" verticalAlign="middle" />
          )}
          <Pie
            data={topPages}
            dataKey="Visitors"
            nameKey="LandingPage"
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={40}
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
