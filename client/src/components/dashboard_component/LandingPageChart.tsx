import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

//  interface for landingPage data
interface PageData {
  "Landing Page": string;
  "Visitors": string;
}

// Function to get top 5 Pages based on visitors from the data
const getTopLandingPages = (data: PageData[]) => {
  return data
    .map(item => ({
      LandingPage: item['Landing Page'],
      Visitors: parseInt(item.Visitors, 10),
    }))
    .sort((a, b) => b.Visitors - a.Visitors)
    .slice(0, 5);
};

interface TopPagesPieChartProps {
  PageData: PageData[];
}


const COLORS = ['#050C9C', '#3572EF', '#3ABEF9', '#577B8D', '#8dd1e1'];

const TopPagesPieChart: React.FC<TopPagesPieChartProps> = ({ PageData }) => {
  console.log(PageData);
  const topPages = getTopLandingPages(PageData);
  console.log(topPages);
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
        {topPages.length>0 ?(
        <PieChart className='px-6'>
          <Tooltip formatter={(value, name) => [`${value}`, `${name}`]} />
          {!isMobileOrTablet && ( // Conditionally render the Legend
            <Legend layout="vertical" align="right" verticalAlign="middle" />
          )}
          <Pie
            data={topPages}
            dataKey="Visitors"
            nameKey="LandingPage"
            cx="35%"
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
        ):(
          <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <p>No data available for top landing pages.Please set up Google Analytics for this data.</p>
          </div>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default TopPagesPieChart;



