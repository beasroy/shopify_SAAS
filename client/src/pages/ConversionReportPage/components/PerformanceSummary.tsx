
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
  metricConfig,

  onCategoryFilter
}) => {
  const [filteredCategory, setFilteredCategory] = useState<string | null>(null);

  const thresholds = useMemo(() => {
    const metrics: Record<string, number> = {
      [metricConfig.primary.key]: 0,
      [metricConfig.secondary.key]: 0
    };
    let totalMonths = 0;

    // Always calculate thresholds from the complete original data
    data.forEach(row => {
      const monthlyData = row.MonthlyData as Array<{ Month: string; [key: string]: any }> | undefined;
      
      if (Array.isArray(monthlyData)) {
        monthlyData.forEach((month) => {
          // Map the metric keys to monthly data keys
          const primaryMonthlyKey = metricConfig.primary.key === "Total Sessions" ? "Sessions" : 
                                   metricConfig.primary.key === "Total Spend" ? "Spend" :
                                   metricConfig.primary.key === "Total Cost" ? "Cost" :
                                   metricConfig.primary.key;
          
          const secondaryMonthlyKey = metricConfig.secondary.key === "Avg Conv. Rate" ? "Conv. Rate" :
                                     metricConfig.secondary.key === "Total Purchase ROAS" ? "Purchase ROAS" :
                                     metricConfig.secondary.key === "Conv. Value / Cost" ? "Conv. Value/ Cost" :
                                     metricConfig.secondary.key;

          const primaryMetric = month[primaryMonthlyKey];
          const secondaryMetric = month[secondaryMonthlyKey];

          if (
            typeof primaryMetric === 'number' &&
            typeof secondaryMetric === 'number'
          ) {
            metrics[metricConfig.primary.key] += Number(primaryMetric);
            metrics[metricConfig.secondary.key] += Number(secondaryMetric);
            totalMonths++;
          }
        });
      }
    });

    return {
      [metricConfig.primary.key]: totalMonths > 0 ? metrics[metricConfig.primary.key] / totalMonths : 0,
      [metricConfig.secondary.key]: totalMonths > 0 ? metrics[metricConfig.secondary.key] / totalMonths : 0
    };
  }, [data, metricConfig]); // Only depend on original data

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
        bgColor: 'bg-[#D7FFDF]',
        count: categorizedItems['Top Performers'].length,
        items: categorizedItems['Top Performers'],
        description: `Above average in both ${metricConfig.primary.name} (>${thresholds[metricConfig.primary.key].toFixed(2)}) and ${metricConfig.secondary.name} (>${thresholds[metricConfig.secondary.key].toFixed(2)})`
      },
      {
        name: `High ${metricConfig.primary.name}`,
        color: 'text-blue-700',
        bgColor: 'bg-[#EFF6FF]',
        count: categorizedItems[`High ${metricConfig.primary.name}`].length,
        items: categorizedItems[`High ${metricConfig.primary.name}`],
        description: `High ${metricConfig.primary.name} (>${thresholds[metricConfig.primary.key].toFixed(2)}) but below average ${metricConfig.secondary.name} (<${thresholds[metricConfig.secondary.key].toFixed(2)})`
      },
      {
        name: `High ${metricConfig.secondary.name}`,
        color: 'text-yellow-700',
        bgColor: 'bg-[#FFFBEB]',
        count: categorizedItems[`High ${metricConfig.secondary.name}`].length,
        items: categorizedItems[`High ${metricConfig.secondary.name}`],
        description: `High ${metricConfig.secondary.name} (>${thresholds[metricConfig.secondary.key].toFixed(2)}) but below average ${metricConfig.primary.name} (<${thresholds[metricConfig.primary.key].toFixed(2)})`
      },
      {
        name: 'Underperformers',
        color: 'text-red-700',
        bgColor: 'bg-[#FFF1F2]',
        count: categorizedItems['Underperformers'].length,
        items: categorizedItems['Underperformers'],
        description: `Below average in both ${metricConfig.primary.name} (<${thresholds[metricConfig.primary.key].toFixed(2)}) and ${metricConfig.secondary.name} (<${thresholds[metricConfig.secondary.key].toFixed(2)})`
      }
    ];
  }, [data, thresholds, primaryColumn, metricConfig]);

  const handleCategoryClick = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    if (category) {
      if (filteredCategory === categoryName) {
        setFilteredCategory(null);
        onCategoryFilter?.([]);
      } else {
        setFilteredCategory(categoryName);
        onCategoryFilter?.(category.items);
      }
    }
  };

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
                    onClick={() => handleCategoryClick(category.name)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-xs font-medium ${category.color} ${filteredCategory === category.name ? 'underline' : ''}`}>
                        {category.name} ({category.count})
                        {filteredCategory === category.name && (
                          <span className="ml-1 inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
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
        </div>
      </div>
    </TooltipProvider>
  );
};

export default PerformanceSummary;