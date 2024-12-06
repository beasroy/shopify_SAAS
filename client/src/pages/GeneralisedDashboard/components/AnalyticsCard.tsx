export interface AnalyticsCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    bgColor: string;
    ribbonText?: string; 
  }
export function AnalyticsCard({ title, description, icon, bgColor, ribbonText }: AnalyticsCardProps) {
    return (
      <div
        className={`relative overflow-hidden shadow-md rounded-lg h-36 p-4 transition-transform transform hover:scale-105 ${bgColor} bg-gradient-to-br`}
      >
        {ribbonText && (
          <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-bl-lg">
            {ribbonText}
          </div>
        )}
        <div className="flex items-start space-x-4 h-full">
          <div className="flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <p className="mt-2 text-sm text-gray-600">{description}</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent" />
      </div>
    );
  }
  
  