import { useState } from "react";
import createAxiosInstance from "@/pages/ConversionReportPage/components/axiosInstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type FormFactor = 'PHONE' | 'DESKTOP' | 'TABLET';

interface MetricData {
    name: string;
    p75: string;
    p75_ms?: number;
    p75_raw?: number;
    status: "good" | "needs-improvement" | "poor";
    distributions: {
        good: { label: string; percentage: string; value: number };
        needsImprovement: { label: string; percentage: string; value: number };
        poor: { label: string; percentage: string; value: number };
    };
    experimental?: boolean;
}

interface SpeedInsightsResponse {
    success: boolean;
    urlUsed: string;
    formFactor: string;
    data: {
        parsed: {
            collectionPeriod: {
                formatted: string;
            };
            coreWebVitals: {
                LCP: MetricData;
                INP: MetricData;
                CLS: MetricData;
            };
            otherMetrics: {
                FCP: MetricData;
                TTFB: MetricData;
            };
            assessment: {
                status: "PASSED" | "FAILED";
                passedVitals: number;
                totalVitals: number;
                message: string;
            };
        };
    };
}

// MetricCard component moved outside to avoid linting warnings
const MetricCard = ({ metric, isCoreVital = false }: { metric: MetricData; isCoreVital?: boolean }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case "good":
                return "text-green-600";
            case "needs-improvement":
                return "text-orange-600";
            case "poor":
                return "text-red-600";
            default:
                return "text-gray-600";
        }
    };

    const goodWidth = metric.distributions.good.value * 100;
    const needsImprovementWidth = metric.distributions.needsImprovement.value * 100;
    const poorWidth = metric.distributions.poor.value * 100;

    // Calculate marker position (approximate based on p75 value)
    // This is a simplified calculation - in reality, you'd need the actual distribution curve
    let markerPosition = 0;
    if (metric.p75_ms !== undefined) {
        // Rough estimation: assume linear distribution
        if (metric.status === "good") {
            markerPosition = (goodWidth * 0.5); // Middle of good range
        } else if (metric.status === "needs-improvement") {
            markerPosition = goodWidth + (needsImprovementWidth * 0.5);
        } else {
            markerPosition = goodWidth + needsImprovementWidth + (poorWidth * 0.5);
        }
    }

    return (
        <div className="bg-white border rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-800">{metric.name}</h3>
                <span className={cn("text-lg font-bold", getStatusColor(metric.status))}>
                    {metric.p75}
                </span>
            </div>

            {/* Distribution Bar */}
            <div className="relative h-4 mb-4 bg-gray-100 rounded overflow-hidden">
                <div className="absolute inset-0 flex">
                    <div
                        className="bg-green-500"
                        style={{ width: `${goodWidth}%` }}
                    />
                    <div
                        className="bg-orange-500"
                        style={{ width: `${needsImprovementWidth}%` }}
                    />
                    <div
                        className="bg-red-500"
                        style={{ width: `${poorWidth}%` }}
                    />
                </div>
                {/* Marker */}
                {markerPosition > 0 && (
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white border border-gray-600 shadow-xl"
                        style={{ left: `${markerPosition}%`, transform: 'translateX(-50%)' }}
                    />
                )}
            </div>

            {/* Distribution Percentages */}
            <div className="space-y-2 mb-4 text-xs">
                <div className="flex items-center justify-between">
                    <span className="text-gray-600">{metric.distributions.good.label}</span>
                    <span className="font-medium text-gray-800">{metric.distributions.good.percentage}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-gray-600">{metric.distributions.needsImprovement.label}</span>
                    <span className="font-medium text-gray-800">{metric.distributions.needsImprovement.percentage}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-gray-600">{metric.distributions.poor.label}</span>
                    <span className="font-medium text-gray-800">{metric.distributions.poor.percentage}</span>
                </div>
            </div>

            {/* 75th Percentile */}
            <div className="text-xs text-gray-600">
                <span className="font-medium">75th Percentile:</span> {metric.p75}
            </div>

            {isCoreVital && (
                <div className="mt-2">
                    <a
                        href="https://web.dev/articles/vitals"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                    >
                        Core Web Vital
                    </a>
                </div>
            )}

            {metric.experimental && (
                <div className="mt-2">
                    <span className="text-sm text-gray-500 italic">Experimental</span>
                </div>
            )}
        </div>
    );
};

export default function SpeedInsights() {
    const [speedInsights, setSpeedInsights] = useState<SpeedInsightsResponse | null>(null);
    const [url, setUrl] = useState<string>("");
    const [currentFormFactor, setCurrentFormFactor] = useState<FormFactor>('PHONE');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [resultsCache, setResultsCache] = useState<Record<string, SpeedInsightsResponse>>({});
    const [hasInitialResult, setHasInitialResult] = useState(false);
    const axiosInstance = createAxiosInstance();

    // Normalize URL - add https:// if no protocol is present
    const normalizeUrl = (urlInput: string): string => {
        const trimmed = urlInput.trim();
        if (!trimmed) return trimmed;
        
        // Check if URL already has a protocol
        const protocolRegex = /^https?:\/\//i;
        if (protocolRegex.exec(trimmed)) {
            return trimmed;
        }
        
        // Add https:// if no protocol
        return `https://${trimmed}`;
    };

    const fetchSpeedInsights = async (formFactor: FormFactor, urlToAnalyze: string) => {
        // Normalize the URL
        const normalizedUrl = normalizeUrl(urlToAnalyze);
        
        // Check cache first
        const cacheKey = `${normalizedUrl}_${formFactor}`;
        if (resultsCache[cacheKey]) {
            setSpeedInsights(resultsCache[cacheKey]);
            setCurrentFormFactor(formFactor);
            // Clear error for this form factor if we have cached data
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[cacheKey];
                return newErrors;
            });
            return;
        }

        setLoading(true);
        // Clear error for this form factor when starting new request
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[cacheKey];
            return newErrors;
        });

        try {
            const response = await axiosInstance.post("/api/pageSpeedInsights", {
                url: normalizedUrl,
                format: formFactor
            });
            
            if (response.data.success) {
            setSpeedInsights(response.data);
                setCurrentFormFactor(formFactor);
                setHasInitialResult(true);
                // Cache the result
                setResultsCache(prev => ({
                    ...prev,
                    [cacheKey]: response.data
                }));
                // Clear error for this form factor on success
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[cacheKey];
                    return newErrors;
                });
            } else {
                const errorMessage = response.data.message || "Failed to fetch speed insights";
                setErrors(prev => ({
                    ...prev,
                    [cacheKey]: errorMessage
                }));
                setCurrentFormFactor(formFactor);
                setHasInitialResult(true);
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || "An error occurred while fetching speed insights";
            setErrors(prev => ({
                ...prev,
                [cacheKey]: errorMessage
            }));
            setCurrentFormFactor(formFactor);
            setHasInitialResult(true);
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyze = async () => {
        if (!url.trim()) {
            return;
        }

        // Normalize URL and update the input field
        const normalizedUrl = normalizeUrl(url);
        if (normalizedUrl !== url) {
            setUrl(normalizedUrl);
        }

        // Clear cache and errors when analyzing a new URL
        setResultsCache({});
        setErrors({});
        setSpeedInsights(null);
        setHasInitialResult(false);
        
        // Always start with PHONE format
        await fetchSpeedInsights('PHONE', normalizedUrl);
    };

    const handleTabChange = async (formFactor: FormFactor) => {
        if (!url.trim()) return;
        await fetchSpeedInsights(formFactor, url.trim());
    };

    const renderResultsContent = () => {
        const normalizedUrl = normalizeUrl(url);
        const currentCacheKey = `${normalizedUrl}_${currentFormFactor}`;
        const currentError = errors[currentCacheKey];
        const hasData = speedInsights?.data?.parsed && speedInsights.formFactor === currentFormFactor;

        if (currentError) {
            return (
                <div className="flex items-start gap-3 pt-6">
                    <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            Error Loading {currentFormFactor} Data
                        </h2>
                        <p className="text-red-800">{currentError}</p>
                    </div>
                </div>
            );
        }

        if (hasData && speedInsights) {
            return (
                <>
                    {/* Core Web Vitals Assessment */}
                    <div className="pt-6 text-center">
                        <div className="flex items-center justify-center mb-3">
                            <div className="flex items-center gap-3">
                                {speedInsights.data.parsed.assessment.status === "PASSED" ? (
                                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                                ) : (
                                    <AlertCircle className="h-6 w-6 text-red-600" />
                                )}
                                <h2 className="text-xl font-bold text-gray-900">
                                    Core Web Vitals Assessment: {speedInsights.data.parsed.assessment.status}
                                </h2>
                            </div>
                        </div>
                        <p className="text-gray-600 mb-4">
                            {speedInsights.data.parsed.assessment.passedVitals} of {speedInsights.data.parsed.assessment.totalVitals} Core Web Vitals passed
                        </p>

                        {/* Core Web Vitals Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                            <MetricCard metric={speedInsights.data.parsed.coreWebVitals.LCP} isCoreVital />
                            <MetricCard metric={speedInsights.data.parsed.coreWebVitals.INP} isCoreVital />
                            <MetricCard metric={speedInsights.data.parsed.coreWebVitals.CLS} isCoreVital />
                        </div>
                    </div>

                    {/* Other Metrics */}
                    <div className="pt-6 border-t border-gray-200 mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <MetricCard metric={speedInsights.data.parsed.otherMetrics.FCP} />
                            <MetricCard metric={speedInsights.data.parsed.otherMetrics.TTFB} />
                        </div>
                    </div>
                </>
            );
        }

        if (loading) {
            return (
                <div className="pt-6">
                    <p className="text-gray-600">Loading {currentFormFactor.toLowerCase()} data...</p>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="bg-gray-50 ">
            <div className="max-w-7xl mx-auto">
             

                {/* Input Form */}
                <div className="bg-white border rounded-lg p-6 shadow-sm mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 mb-2">
                                Website URL
                            </label>
                            <Input
                                id="url-input"
                                type="text"
                                placeholder="https://example.com"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleAnalyze();
                                    }
                                }}
                                className="w-full"
                            />
                        </div>
                        <div className="flex items-end">
                            <Button
                                onClick={handleAnalyze}
                                disabled={loading || !url.trim()}
                                className="w-full md:w-auto"
                            >
                                {loading ? "Analyzing..." : "Analyze"}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Results */}
                {hasInitialResult && (() => {
                    const normalizedUrl = normalizeUrl(url);
                    const hasData = speedInsights?.data?.parsed && speedInsights.formFactor === currentFormFactor;
                    
                    return (
                        <div className="bg-white border rounded-lg p-6 shadow-sm">
                           

                            {/* Device Type Tabs */}
                            <div className="flex justify-center gap-2 border-b border-gray-200 mb-2">
                                <button
                                    type="button"
                                    onClick={() => handleTabChange('PHONE')}
                                    disabled={loading}
                                    className={cn(
                                        "px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                                        currentFormFactor === 'PHONE'
                                            ? "text-blue-600 border-blue-600"
                                            : "text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300",
                                        loading && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    Mobile
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleTabChange('DESKTOP')}
                                    disabled={loading}
                                    className={cn(
                                        "px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                                        currentFormFactor === 'DESKTOP'
                                            ? "text-blue-600 border-blue-600"
                                            : "text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300",
                                        loading && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    Desktop
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleTabChange('TABLET')}
                                    disabled={loading}
                                    className={cn(
                                        "px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                                        currentFormFactor === 'TABLET'
                                            ? "text-blue-600 border-blue-600"
                                            : "text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300",
                                        loading && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    Tablet
                                </button>
                            </div>

                            {/* Error Message or Metrics */}
                            {renderResultsContent()}
                             {/* Header with URL and Collection Period */}
                             <div className="flex items-center justify-center text-center mt-6">
                                <div>
                                    {hasData && speedInsights ? (
                                        <>
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">Collection Period:</span>{" "}
                                                {speedInsights.data.parsed.collectionPeriod.formatted}
                                            </p>
                                            <p className="text-sm text-gray-600 mt-1">
                                                <span className="font-medium">URL Analyzed:</span> {speedInsights.urlUsed}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">URL Analyzed:</span> {normalizedUrl}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
