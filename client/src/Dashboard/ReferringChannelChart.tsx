import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface ReferringChannelsChartProps {
  rawData: { channel: string; visitors: string }[]; // Accept raw data
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FF6699', '#FF33CC'];

export const ReferringChannelChart: React.FC<ReferringChannelsChartProps> = ({ rawData }) => {
  // Aggregate visitors by channel
  const aggregatedData = rawData.reduce((acc, entry) => {
    const channel = entry.channel;
    const visitors = parseInt(entry.visitors, 10); // Convert visitors to number

    if (!acc[channel]) {
      acc[channel] = { channel, totalVisitors: 0 };
    }
    acc[channel].totalVisitors += visitors; // Sum visitors for each channel

    return acc;
  }, {} as Record<string, { channel: string; totalVisitors: number }>);

  // Convert aggregated data back to an array and sort by total visitors
  const topChannels = Object.values(aggregatedData)
    .sort((a, b) => b.totalVisitors - a.totalVisitors)
    .slice(0, 5); // Get top 5 channels

  // Custom legend component
  const renderLegend = () => (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
      {topChannels.map((entry, index) => (
        <div key={`legend-${index}`} style={{ margin: '0 10px', display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: '15px',
              height: '15px',
              backgroundColor: COLORS[index % COLORS.length],
              marginRight: '5px',
            }}
          />
          <span className='text-xs'>{entry.channel}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div> {/* Wrap everything in a div */}
       {renderLegend()}
      {/* ResponsiveContainer should only contain one child */}
      <ResponsiveContainer width="100%" height={300}> 
        <PieChart>
          <Pie
            data={topChannels}
            dataKey="totalVisitors"
            nameKey="channel"
            cx="50%"
            cy="50%"
            outerRadius="60%" // Reduced outerRadius to fit within the card
            label
          >
            {topChannels.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      {/* The custom legend should be placed outside the ResponsiveContainer */}
   
    </div>
  );
};
