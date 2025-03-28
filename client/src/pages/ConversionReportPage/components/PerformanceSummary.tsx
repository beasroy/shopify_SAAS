
import React, { useMemo, useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PerformanceSummaryProps, CategoryData } from '@/interfaces';



const PerformanceSummary: React.FC<PerformanceSummaryProps> = ({
  data,
  primaryColumn,
  metricConfig
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const thresholds = useMemo(() => {
    const metrics: Record<string, number> = {
      [metricConfig.primary.key]: 0,
      [metricConfig.secondary.key]: 0
    };
    let count = 0;

    data.forEach(row => {
      const primaryMetric = row[metricConfig.primary.key];
      const secondaryMetric = row[metricConfig.secondary.key];

      if (
        typeof primaryMetric === 'number' &&
        typeof secondaryMetric === 'number'
      ) {
        metrics[metricConfig.primary.key] += Number(primaryMetric);
        metrics[metricConfig.secondary.key] += Number(secondaryMetric);
        count++;
      }
    });

    return {
      [metricConfig.primary.key]: metrics[metricConfig.primary.key] / count,
      [metricConfig.secondary.key]: metrics[metricConfig.secondary.key] / count
    };
  }, [data, metricConfig]);

  const categories: CategoryData[] = useMemo(() => {
    const categorizedItems: Record<string, (string | number)[]> = {
      'Top Performers': [],
      [`High ${metricConfig.primary.name}`]: [],
      [`High ${metricConfig.secondary.name}`]: [],
      'Underperformers': []
    };

    data.forEach(row => {
      const primaryMetric = Number(row[metricConfig.primary.key]);
      const secondaryMetric = Number(row[metricConfig.secondary.key]);
      const primaryValue = String(row[primaryColumn]);

      const isHighPrimary = primaryMetric >= thresholds[metricConfig.primary.key];
      const isHighSecondary = secondaryMetric >= thresholds[metricConfig.secondary.key];

      if (isHighPrimary && isHighSecondary) {
        categorizedItems['Top Performers'].push(primaryValue);
      } else if (isHighPrimary && !isHighSecondary) {
        categorizedItems[`High ${metricConfig.primary.name}`].push(primaryValue);
      } else if (!isHighPrimary && isHighSecondary) {
        categorizedItems[`High ${metricConfig.secondary.name}`].push(primaryValue);
      } else {
        categorizedItems['Underperformers'].push(primaryValue);
      }
    });

    return [
      {
        name: 'Top Performers',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        count: categorizedItems['Top Performers'].length,
        items: categorizedItems['Top Performers'],
        description: `Above average in both ${metricConfig.primary.name} (>${thresholds[metricConfig.primary.key].toFixed(2)}) and ${metricConfig.secondary.name} (>${thresholds[metricConfig.secondary.key].toFixed(2)})`
      },
      {
        name: `High ${metricConfig.primary.name}`,
        color: 'text-blue-700',
        bgColor: 'bg-[#E0F4FF]',
        count: categorizedItems[`High ${metricConfig.primary.name}`].length,
        items: categorizedItems[`High ${metricConfig.primary.name}`],
        description: `High ${metricConfig.primary.name} (>${thresholds[metricConfig.primary.key].toFixed(2)}) but below average ${metricConfig.secondary.name} (<${thresholds[metricConfig.secondary.key].toFixed(2)})`
      },
      {
        name: `High ${metricConfig.secondary.name}`,
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100',
        count: categorizedItems[`High ${metricConfig.secondary.name}`].length,
        items: categorizedItems[`High ${metricConfig.secondary.name}`],
        description: `High ${metricConfig.secondary.name} (>${thresholds[metricConfig.secondary.key].toFixed(2)}) but below average ${metricConfig.primary.name} (<${thresholds[metricConfig.primary.key].toFixed(2)})`
      },
      {
        name: 'Underperformers',
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        count: categorizedItems['Underperformers'].length,
        items: categorizedItems['Underperformers'],
        description: `Below average in both ${metricConfig.primary.name} (<${thresholds[metricConfig.primary.key].toFixed(2)}) and ${metricConfig.secondary.name} (<${thresholds[metricConfig.secondary.key].toFixed(2)})`
      }
    ];
  }, [data, thresholds, primaryColumn, metricConfig]);

  return (
    <TooltipProvider>
      <div id="age-report-performance" className="space-y-4 py-2.5">
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <div className="flex items-stretch h-9">
            {categories.map((category) => (
              <Tooltip key={category.name}>
                <TooltipTrigger asChild>
                  <div
                    className={`relative flex-grow ${category.bgColor} border-r last:border-r-0 border-gray-300 cursor-pointer transition-all duration-300 ease-in-out hover:opacity-90`}
                    onClick={() => setExpandedCategory(expandedCategory === category.name ? null : category.name)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-xs font-medium ${category.color} ${expandedCategory === category.name ? 'underline' : ''}`}>
                        {category.name} ({category.count})
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-4 bg-gray-900 text-white border-0 shadow-lg">
                  <div>
                    
                    {/* Category name and larger color sample */}
                    <div  className="flex items-center gap-3 mb-3">
                      <div className={`w-8 h-8 rounded-lg ${category.bgColor} border border-white/20 flex items-center justify-center`}>
                        <div className={`w-4 h-4 rounded-md ${category.color.replace('text-', 'bg-')}`} />
                      </div>
                      <p className="font-medium text-lg text-white">
                        {category.name}
                      </p>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-200">{category.description}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          {expandedCategory && (
            <div className="p-4 bg-white border-t border-gray-200">
              <h3 className={`text-lg font-semibold mb-2 flex items-center gap-2 ${categories.find(c => c.name === expandedCategory)?.color}`}>
                {expandedCategory}
                <span className={`w-3 h-3 rounded-lg ${categories.find(c => c.name === expandedCategory)?.bgColor} border border-gray-200`} />
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
      </div>
    </TooltipProvider>
  );
};




export default PerformanceSummary;