// AdAccountMetrics.js
import React from 'react';
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {  HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Campaign, GoogleCampaign } from '../Dashboard/interfaces';


// Define the type for each metric
export interface Metric {
  label: string;
  value: string | number;
  tooltipContent?: string

}

// Define the props for the AdAccountMetrics component
interface AdAccountMetricsProps {
  title?: string;
  metrics: Metric[];
  date: DateRange;
  isLoading: boolean;
  icon?: 'Facebook' | 'Google' | '';
  tooltipContent?: string
  errorMessage?: string;
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

interface MetricCardProps extends Metric {
  date: DateRange;
  icon?: 'Facebook' | 'Google' | ''

}
interface LogoProps {
  width?: string | number;
  height?: string | number;
}

export const FacebookLogo: React.FC<LogoProps> = ({ width = '1.25rem', height = '1.25rem' }) => (
  <svg style={{ height, width }}fill="#1877F2" viewBox="0 0 24 24">
  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
</svg>
);

export const GoogleLogo: React.FC<LogoProps> = ({ width = '1.25rem', height = '1.25rem' }) => (
  <svg viewBox="0 0 24 24" style={{ height, width }}>
  <path d="M13.5437 4.24116L13.5441 4.24138C13.904 4.43971 14.2179 4.70303 14.4689 5.01529C14.7198 5.3275 14.903 5.68264 15.009 6.0601L15.4904 5.92486L15.009 6.0601C15.115 6.43752 15.1422 6.83078 15.0891 7.21776C15.0361 7.60457 14.9038 7.97861 14.6989 8.31855C14.6988 8.31873 14.6987 8.31891 14.6986 8.3191L8.41444 18.701C7.9918 19.3741 7.30557 19.868 6.49825 20.0687C5.68937 20.2699 4.83087 20.1586 4.10949 19.7614C3.38872 19.3646 2.86649 18.7168 2.64727 17.9633C2.42868 17.212 2.5264 16.4083 2.92214 15.7226L9.20689 5.33823C9.20695 5.33813 9.20702 5.33802 9.20708 5.33792C9.62451 4.65082 10.3142 4.14383 11.1301 3.93599C11.9464 3.72804 12.8151 3.83872 13.5437 4.24116Z" fill="#FFB70A" stroke="#FFB70A"></path>
  <path d="M21.5404 15.4544L15.24 5.04127C14.7453 4.25097 13.9459 3.67817 13.0138 3.44633C12.0817 3.21448 11.0917 3.34215 10.2572 3.80182C9.4226 4.26149 8.8103 5.01636 8.55224 5.90372C8.29418 6.79108 8.41102 7.73988 8.87757 8.54562L15.178 18.9587C15.6726 19.749 16.4721 20.3218 17.4042 20.5537C18.3362 20.7855 19.3262 20.6579 20.1608 20.1982C20.9953 19.7385 21.6076 18.9836 21.8657 18.0963C22.1238 17.2089 22.0069 16.2601 21.5404 15.4544Z" fill="#3B8AD8"></path>
  <path d="M9.23018 16.2447C9.07335 15.6884 8.77505 15.1775 8.36166 14.7572C7.94827 14.3369 7.43255 14.0202 6.86011 13.835C6.28768 13.6499 5.67618 13.6021 5.07973 13.6958C4.48328 13.7895 3.92026 14.0219 3.44049 14.3723C2.96071 14.7227 2.57898 15.1804 2.32906 15.7049C2.07914 16.2294 1.96873 16.8045 2.00762 17.3794C2.0465 17.9542 2.23347 18.5111 2.55199 19.0007C2.8705 19.4902 3.31074 19.8975 3.83376 20.1863C4.46363 20.5354 5.1882 20.6983 5.91542 20.6542C6.64264 20.6101 7.33969 20.361 7.91802 19.9386C8.49636 19.5162 8.92988 18.9395 9.16351 18.2817C9.39715 17.624 9.42035 16.915 9.23018 16.2447Z" fill="#2CAA14"></path>
</svg>
)


const MetricCardSkeleton: React.FC = () => {
  return (
    <Card className="transition-transform transform hover:scale-105 hover:border hover:border-blue-600">
      <CardHeader className='flex flex-col items-start justify-start'>
        <div className="flex flex-row items-center gap-2">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-4 w-32 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mt-2" />
      </CardContent>
    </Card>
  )
}


// MetricCard component to render each metric using ShadCN Card
const MetricCard: React.FC<MetricCardProps> = ({ label, value, date, icon, tooltipContent }) => {
  const formatDate = (dateValue: Date | undefined) => {
    if (!dateValue) return "";
    if (typeof dateValue === "string") {
      dateValue = new Date(dateValue); // Convert string to Date
    }
    return dateValue.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Card className="transition-transform transform hover:scale-105 hover:border hover:border-blue-600">
      <CardHeader className='flex flex-col items-start justify-start'>
        <div className="flex flex-row items-center gap-2">
          {icon === 'Facebook' ? (
            <FacebookLogo width="1rem" height="1rem" />
          ) : icon === 'Google' ? (
            <GoogleLogo width="1rem" height="1rem" />
          ) : null}

          <div className="text-base font-medium">{label}</div>

          {tooltipContent && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="p-0 m-0" aria-label={`Info about ${label}`}>
                    <HelpCircle className="w-3 h-3 text-gray-400" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="w-64 p-0 bg-white text-black border shadow-sm">
                  <div className="p-2 font-semibold border-black">{label}</div>
                  <div className="w-full h-[0.5px] bg-black" />
                  <div className="p-2">{tooltipContent}</div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="text-xs text-gray-500 font-bold">
          {formatDate(date.from)}
          {date.from && date.to ? ' - ' : ''}
          {formatDate(date.to)}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xl lg:text-2xl 2xl:text-3xl font-bold text-cyan-950">{value}</p>
      </CardContent>
    </Card>
  )
};


const AdAccountMetricsCard: React.FC<AdAccountMetricsProps> = ({ title, metrics = [], date, isLoading = false, icon, errorMessage }) => {
  if (errorMessage && !isLoading) {
    return (
      <section className={title ? 'mt-10' : ''}>
        <Card className="p-4">
          <CardHeader><h2 className="text-xl font-semibold flex items-center space-x-2">
            {title && (
              <>
                {icon === 'Facebook' ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    <path d="M13.5437 4.24116L13.5441 4.24138C13.904 4.43971 14.2179 4.70303 14.4689 5.01529C14.7198 5.3275 14.903 5.68264 15.009 6.0601L15.4904 5.92486L15.009 6.0601C15.115 6.43752 15.1422 6.83078 15.0891 7.21776C15.0361 7.60457 14.9038 7.97861 14.6989 8.31855C14.6988 8.31873 14.6987 8.31891 14.6986 8.3191L8.41444 18.701C7.9918 19.3741 7.30557 19.868 6.49825 20.0687C5.68937 20.2699 4.83087 20.1586 4.10949 19.7614C3.38872 19.3646 2.86649 18.7168 2.64727 17.9633C2.42868 17.212 2.5264 16.4083 2.92214 15.7226L9.20689 5.33823C9.20695 5.33813 9.20702 5.33802 9.20708 5.33792C9.62451 4.65082 10.3142 4.14383 11.1301 3.93599C11.9464 3.72804 12.8151 3.83872 13.5437 4.24116Z" fill="#FFB70A" stroke="#FFB70A"></path>
                    <path d="M21.5404 15.4544L15.24 5.04127C14.7453 4.25097 13.9459 3.67817 13.0138 3.44633C12.0817 3.21448 11.0917 3.34215 10.2572 3.80182C9.4226 4.26149 8.8103 5.01636 8.55224 5.90372C8.29418 6.79108 8.41102 7.73988 8.87757 8.54562L15.178 18.9587C15.6726 19.749 16.4721 20.3218 17.4042 20.5537C18.3362 20.7855 19.3262 20.6579 20.1608 20.1982C20.9953 19.7385 21.6076 18.9836 21.8657 18.0963C22.1238 17.2089 22.0069 16.2601 21.5404 15.4544Z" fill="#3B8AD8"></path>
                    <path d="M9.23018 16.2447C9.07335 15.6884 8.77505 15.1775 8.36166 14.7572C7.94827 14.3369 7.43255 14.0202 6.86011 13.835C6.28768 13.6499 5.67618 13.6021 5.07973 13.6958C4.48328 13.7895 3.92026 14.0219 3.44049 14.3723C2.96071 14.7227 2.57898 15.1804 2.32906 15.7049C2.07914 16.2294 1.96873 16.8045 2.00762 17.3794C2.0465 17.9542 2.23347 18.5111 2.55199 19.0007C2.8705 19.4902 3.31074 19.8975 3.83376 20.1863C4.46363 20.5354 5.1882 20.6983 5.91542 20.6542C6.64264 20.6101 7.33969 20.361 7.91802 19.9386C8.49636 19.5162 8.92988 18.9395 9.16351 18.2817C9.39715 17.624 9.42035 16.915 9.23018 16.2447Z" fill="#2CAA14"></path>
                  </svg>
                )}
                <span>{title}</span>
              </>
            )}
          </h2>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 text-sm">{errorMessage}</p>
          </CardContent>
        </Card>
      </section>
    );
  }
  return (
    <section className={title ? 'mt-10' : ''}>
      <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
        {title && (
          <>
            {icon === 'Facebook' ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path d="M13.5437 4.24116L13.5441 4.24138C13.904 4.43971 14.2179 4.70303 14.4689 5.01529C14.7198 5.3275 14.903 5.68264 15.009 6.0601L15.4904 5.92486L15.009 6.0601C15.115 6.43752 15.1422 6.83078 15.0891 7.21776C15.0361 7.60457 14.9038 7.97861 14.6989 8.31855C14.6988 8.31873 14.6987 8.31891 14.6986 8.3191L8.41444 18.701C7.9918 19.3741 7.30557 19.868 6.49825 20.0687C5.68937 20.2699 4.83087 20.1586 4.10949 19.7614C3.38872 19.3646 2.86649 18.7168 2.64727 17.9633C2.42868 17.212 2.5264 16.4083 2.92214 15.7226L9.20689 5.33823C9.20695 5.33813 9.20702 5.33802 9.20708 5.33792C9.62451 4.65082 10.3142 4.14383 11.1301 3.93599C11.9464 3.72804 12.8151 3.83872 13.5437 4.24116Z" fill="#FFB70A" stroke="#FFB70A"></path>
                <path d="M21.5404 15.4544L15.24 5.04127C14.7453 4.25097 13.9459 3.67817 13.0138 3.44633C12.0817 3.21448 11.0917 3.34215 10.2572 3.80182C9.4226 4.26149 8.8103 5.01636 8.55224 5.90372C8.29418 6.79108 8.41102 7.73988 8.87757 8.54562L15.178 18.9587C15.6726 19.749 16.4721 20.3218 17.4042 20.5537C18.3362 20.7855 19.3262 20.6579 20.1608 20.1982C20.9953 19.7385 21.6076 18.9836 21.8657 18.0963C22.1238 17.2089 22.0069 16.2601 21.5404 15.4544Z" fill="#3B8AD8"></path>
                <path d="M9.23018 16.2447C9.07335 15.6884 8.77505 15.1775 8.36166 14.7572C7.94827 14.3369 7.43255 14.0202 6.86011 13.835C6.28768 13.6499 5.67618 13.6021 5.07973 13.6958C4.48328 13.7895 3.92026 14.0219 3.44049 14.3723C2.96071 14.7227 2.57898 15.1804 2.32906 15.7049C2.07914 16.2294 1.96873 16.8045 2.00762 17.3794C2.0465 17.9542 2.23347 18.5111 2.55199 19.0007C2.8705 19.4902 3.31074 19.8975 3.83376 20.1863C4.46363 20.5354 5.1882 20.6983 5.91542 20.6542C6.64264 20.6101 7.33969 20.361 7.91802 19.9386C8.49636 19.5162 8.92988 18.9395 9.16351 18.2817C9.39715 17.624 9.42035 16.915 9.23018 16.2447Z" fill="#2CAA14"></path>
              </svg>
            )}
            <span>{title}</span>
          </>
        )}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading
          ? Array(metrics.length).fill(0).map((_, index) => <MetricCardSkeleton key={index} />)
          : metrics.map((metric, index) => (
            <>
              <MetricCard key={index} label={metric.label} value={metric.value} date={date} icon={icon} tooltipContent={metric.tooltipContent} />
            </>
          ))
        }
      </div>
    </section>
  )
}

export default AdAccountMetricsCard;

export const CampaignGrid = ({ campaigns, isLoading, icon }: { campaigns: (Campaign | GoogleCampaign)[], isLoading: boolean, icon: string }) => {
  return isLoading ? (
    <div>Loading...</div>
  ) : (
    <Card className=" p-4 my-4  hover:border hover:border-blue-600">
      <div className='flex items-center space-x-2 mb-3'>
        {icon === 'Facebook' ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path d="M13.5437 4.24116L13.5441 4.24138C13.904 4.43971 14.2179 4.70303 14.4689 5.01529C14.7198 5.3275 14.903 5.68264 15.009 6.0601L15.4904 5.92486L15.009 6.0601C15.115 6.43752 15.1422 6.83078 15.0891 7.21776C15.0361 7.60457 14.9038 7.97861 14.6989 8.31855C14.6988 8.31873 14.6987 8.31891 14.6986 8.3191L8.41444 18.701C7.9918 19.3741 7.30557 19.868 6.49825 20.0687C5.68937 20.2699 4.83087 20.1586 4.10949 19.7614C3.38872 19.3646 2.86649 18.7168 2.64727 17.9633C2.42868 17.212 2.5264 16.4083 2.92214 15.7226L9.20689 5.33823C9.20695 5.33813 9.20702 5.33802 9.20708 5.33792C9.62451 4.65082 10.3142 4.14383 11.1301 3.93599C11.9464 3.72804 12.8151 3.83872 13.5437 4.24116Z" fill="#FFB70A" stroke="#FFB70A"></path>
            <path d="M21.5404 15.4544L15.24 5.04127C14.7453 4.25097 13.9459 3.67817 13.0138 3.44633C12.0817 3.21448 11.0917 3.34215 10.2572 3.80182C9.4226 4.26149 8.8103 5.01636 8.55224 5.90372C8.29418 6.79108 8.41102 7.73988 8.87757 8.54562L15.178 18.9587C15.6726 19.749 16.4721 20.3218 17.4042 20.5537C18.3362 20.7855 19.3262 20.6579 20.1608 20.1982C20.9953 19.7385 21.6076 18.9836 21.8657 18.0963C22.1238 17.2089 22.0069 16.2601 21.5404 15.4544Z" fill="#3B8AD8"></path>
            <path d="M9.23018 16.2447C9.07335 15.6884 8.77505 15.1775 8.36166 14.7572C7.94827 14.3369 7.43255 14.0202 6.86011 13.835C6.28768 13.6499 5.67618 13.6021 5.07973 13.6958C4.48328 13.7895 3.92026 14.0219 3.44049 14.3723C2.96071 14.7227 2.57898 15.1804 2.32906 15.7049C2.07914 16.2294 1.96873 16.8045 2.00762 17.3794C2.0465 17.9542 2.23347 18.5111 2.55199 19.0007C2.8705 19.4902 3.31074 19.8975 3.83376 20.1863C4.46363 20.5354 5.1882 20.6983 5.91542 20.6542C6.64264 20.6101 7.33969 20.361 7.91802 19.9386C8.49636 19.5162 8.92988 18.9395 9.16351 18.2817C9.39715 17.624 9.42035 16.915 9.23018 16.2447Z" fill="#2CAA14"></path>
          </svg>
        )}
        <h3 className="text-lg font-semibold">Campaign Performance</h3>
      </div>

      {/* Wrapper for scrolling */}
      <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
        <table className="min-w-full table-auto border-collapse bg-white shadow-md rounded-lg">
          <thead>
            <tr className="bg-gray-100 text-left text-sm font-medium text-gray-700 sticky top-0">
              <th className="px-6 py-3">Campaign Name</th>
              <th className="px-6 py-3 text-center">Spend (₹)</th>
              <th className="px-6 py-3 text-center">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign: Campaign | GoogleCampaign, index) => {
              const spendValue = parseFloat(String(campaign.spend));
              let roas = null;
              if (typeof campaign.purchase_roas === 'string') {
                roas = campaign.purchase_roas;
              } else if (Array.isArray(campaign.purchase_roas)) {
                roas = campaign.purchase_roas[0]?.value;
              }
              const roasValue = roas ? parseFloat(String(roas)) : null;

              return (
                <tr
                  key={index}
                  className={`border-t text-sm ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                    }`}
                >
                  <td className="px-6 py-3 line-clamp-2" title={String(campaign.campaign_name)}>
                    {campaign.campaign_name}
                  </td>
                  <td className="px-6 py-3 text-center text-gray-700 font-semibold">
                  ₹{spendValue.toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {roasValue !== null ? (
                      <span className="inline-flex items-center rounded-full font-medium">
                        {roasValue.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-500">N/A</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

