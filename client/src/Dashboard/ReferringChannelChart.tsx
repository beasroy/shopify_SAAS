import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface ReferringChannelsChartProps {
  rawData: { Channel: string; Visitors: string }[]; // Accept raw data
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FF6699', '#FF33CC'];

export const ReferringChannelChart: React.FC<ReferringChannelsChartProps> = ({ rawData }) => {
  // Aggregate visitors by channel
  const aggregatedData = rawData.reduce((acc, entry) => {
    const Channel = entry.Channel;
    const Visitors = parseInt(entry.Visitors, 10); // Convert visitors to number

    if (!acc[Channel]) {
      acc[Channel] = { Channel, totalVisitors: 0 };
    }
    acc[Channel].totalVisitors += Visitors; // Sum visitors for each channel

    return acc;
  }, {} as Record<string, { Channel: string; totalVisitors: number }>);

  // Convert aggregated data back to an array and sort by total visitors
  const topChannels = Object.values(aggregatedData)
    .sort((a, b) => b.totalVisitors - a.totalVisitors)
    .slice(0, 5); // Get top 5 channels

  // Custom legend component
  const renderLegend = () => (
    <div className="grid grid-cols-3 gap-2 mt-2">
      {topChannels.map((entry, index) => (
        <div key={`legend-${index}`} className="flex items-center">
          <div
            className="w-4 h-4 mr-2"
            style={{ backgroundColor: COLORS[index % COLORS.length] }}
          />
          <span className="text-xs">{entry.Channel}</span>
        </div>
      ))}
    </div>
  );
  

  return (
    <div> {/* Wrap everything in a div */}
       {renderLegend()}
      {/* ResponsiveContainer should only contain one child */}
      <ResponsiveContainer width="100%" height={280}> 
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
            {topChannels.map((_, index) => (
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
