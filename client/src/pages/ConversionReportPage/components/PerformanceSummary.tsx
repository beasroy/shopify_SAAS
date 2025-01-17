import { useMemo, useState } from 'react';
import { RowData } from './Table';

interface PerformanceSummaryProps {
  data: RowData[];
  primaryColumn: string;
}

interface CategoryData {
  name: string;
  color: string;
  bgColor: string;
  count: number;
  items: (string | number)[];
}

const PerformanceSummary: React.FC<PerformanceSummaryProps> = ({ data, primaryColumn }) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const thresholds = useMemo(() => {
    let totalSessions = 0;
    let totalConvRate = 0;
    let count = 0;

    data.forEach(row => {
      if (typeof row['Total Sessions'] === 'number' && typeof row['Avg Conv. Rate'] === 'number') {
        totalSessions += Number(row['Total Sessions']);
        totalConvRate += Number(row['Avg Conv. Rate']);
        count++;
      }
    });

    return {
      avgSessions: totalSessions / count,
      avgConvRate: totalConvRate / count
    };
  }, [data]);

  const categories: CategoryData[] = useMemo(() => {
    const categorizedItems: Record<string, (string | number)[]> = {
      'Top Performers': [],
      'High Traffic': [],
      'Good Converters': [],
      'Underperformers': []
    };

    data.forEach(row => {
      const sessions = Number(row['Total Sessions']);
      const convRate = Number(row['Avg Conv. Rate']);
      const primaryValue = String(row[primaryColumn]);

      const isHighSessions = sessions >= thresholds.avgSessions;
      const isGoodConversion = convRate >= thresholds.avgConvRate;

      if (isHighSessions && isGoodConversion) {
        categorizedItems['Top Performers'].push(primaryValue);
      } else if (isHighSessions && !isGoodConversion) {
        categorizedItems['High Traffic'].push(primaryValue);
      } else if (!isHighSessions && isGoodConversion) {
        categorizedItems['Good Converters'].push(primaryValue);
      } else {
        categorizedItems['Underperformers'].push(primaryValue);
      }
    });

    return [
      { name: 'Top Performers', color: 'text-green-700', bgColor: 'bg-green-100', count: categorizedItems['Top Performers'].length, items: categorizedItems['Top Performers'] },
      { name: 'High Traffic', color: 'text-blue-700', bgColor: 'bg-blue-100', count: categorizedItems['High Traffic'].length, items: categorizedItems['High Traffic'] },
      { name: 'Good Converters', color: 'text-yellow-700', bgColor: 'bg-yellow-100', count: categorizedItems['Good Converters'].length, items: categorizedItems['Good Converters'] },
      { name: 'Underperformers', color: 'text-red-700', bgColor: 'bg-red-50', count: categorizedItems['Underperformers'].length, items: categorizedItems['Underperformers'] }
    ];
  }, [data, thresholds, primaryColumn]);

  return (
    <div className="my-2.5 border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-stretch h-9">
        {categories.map((category) => (
          <div
            key={category.name}
            className={`relative flex-grow ${category.bgColor} cursor-pointer transition-all duration-300 ease-in-out`}
            onClick={() => setExpandedCategory(expandedCategory === category.name ? null : category.name)}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xs font-medium ${category.color} ${expandedCategory === category.name ? 'underline' : ''}`}>
                {category.name} ({category.count})
              </span>
            </div>
          </div>
        ))}
      </div>
      {expandedCategory && (
        <div className="p-4 bg-white border-t border-gray-200">
          <h3 className={`text-lg font-semibold mb-2 ${categories.find(c => c.name === expandedCategory)?.color}`}>
            {expandedCategory}
          </h3>
          <ul className="grid grid-cols-4 list-disc pl-5 max-h-40 overflow-y-auto gap-4">
            {categories.find(c => c.name === expandedCategory)?.items.map((item, index) => (
              <li key={index} className="text-sm mb-1 break-words w-full">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PerformanceSummary;
