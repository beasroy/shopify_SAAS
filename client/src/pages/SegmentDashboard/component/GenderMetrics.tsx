import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { BarChart as BarChartIcon, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ColumnDef = {
    id: string;
    header: string;
    accessorKey: string;
    cell?: (value: any) => React.ReactNode | undefined;
};

type GenderMetricsProps = {
    apiEndpoint: string;
};

type MetricsData = {
    totalClicks: number;
    totalCost: number;
    totalConversions: number;
    totalCTR: number;
};

type AggregatedData = Record<string, MetricsData>;

const GenderMetrics: React.FC<GenderMetricsProps> = ({ apiEndpoint }) => {
    const [data, setData] = useState<any[]>([]);
    const [columns, setColumns] = useState<ColumnDef[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
    const [aggregatedData, setAggregatedData] = useState<AggregatedData | null>(null);

    // Fetch data from the API
    const fetchGenderData = useCallback(async () => {
        if (!apiEndpoint) {
            setError('API endpoint is missing');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log(`Fetching data from: ${apiEndpoint}`);

            const response = await axios.post(apiEndpoint, {}, { withCredentials: true });
            console.log('API Response:', response.data); // Log the entire response

            if (response.data.success) {
                const genderData = response.data.genderData || [];
                console.log('Fetched gender data:', genderData); // Log data to verify the structure

                setData(genderData);
                setAggregatedData(response.data.aggregatedRecords);

                if (genderData.length > 0) {
                    const cols: ColumnDef[] = [
                        { id: 'campaignName', header: 'Campaign Name', accessorKey: 'campaignName' },
                        { id: 'adGroupName', header: 'Ad Group Name', accessorKey: 'adGroupName' },
                        { id: 'campaignStatus', header: 'Campaign Status', accessorKey: 'campaignStatus' },
                        { id: 'adGroupStatus', header: 'Ad Group Status', accessorKey: 'adGroupStatus' },
                        { id: 'conversions', header: 'Conversions', accessorKey: 'conversions' },
                        { id: 'clicks', header: 'Clicks', accessorKey: 'clicks' },
                        { id: 'ctr', header: 'CTR', accessorKey: 'ctr' },
                        { id: 'cost', header: 'Cost', accessorKey: 'cost' }
                    ];
                    setColumns(cols);
                }
            } else {
                setError('Failed to fetch gender data');
            }
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                if (err.response?.status === 404) {
                    console.error('404 Error: Endpoint not found:', err.response?.data);
                    setError('Error: Data not found (404)');
                } else {
                    console.error('Axios Error:', err.response?.status, err.response?.data);
                    setError(`Error fetching gender data: ${err.response?.status} - ${err.response?.statusText}`);
                }
            } else if (err instanceof Error) {
                console.error('Error:', err.message);
                setError(`Error fetching gender data: ${err.message}`);
            } else {
                console.error('Unknown Error');
                setError('Error fetching gender data: Unknown error');
            }
        } finally {
            setLoading(false);
        }
    }, [apiEndpoint]);

    // Fetch data on component mount
    useEffect(() => {
        fetchGenderData();
    }, [fetchGenderData]);

    // Toggle view mode
    const toggleViewMode = () => {
        setViewMode(prevMode => (prevMode === 'table' ? 'chart' : 'table'));
    };

    // Prepare data for chart (aggregate by gender)
    const prepareChartData = () => {
        if (!aggregatedData) return [];

        return Object.entries(aggregatedData)
            .filter(([gender]) => gender !== 'genderCampaignAdGroupPairs' && gender !== 'genderStatusOptions')
            .map(([gender, metrics]: [string, MetricsData]) => ({
                gender,
                clicks: metrics.totalClicks,
                cost: parseFloat(metrics.totalCost.toFixed(2)),
                conversions: metrics.totalConversions
            }));
    };

    // Show skeleton while loading
    if (loading) {
        return <Skeleton className="h-4 w-full" />;
    }

    // Show error if there's any
    if (error) {
        return <div className="text-red-500">{error}</div>;
    }

    // Render chart view
    const renderChart = () => {
        const chartData = prepareChartData();
        
        return (
            <div className="w-full h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 40, // Extra space for labels at the bottom
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="gender"
                            angle={-45}
                            textAnchor="end"
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="cost" fill="#8884d8" name="Cost">
                            <LabelList dataKey="cost" position="top" formatter={(value: any) => `$${value}`} />
                        </Bar>
                        <Bar dataKey="clicks" fill="#82ca9d" name="Clicks">
                            <LabelList dataKey="clicks" position="top" />
                        </Bar>
                        <Bar dataKey="conversions" fill="#ffc658" name="Conversions">
                            <LabelList dataKey="conversions" position="top" />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    // Render table view
    const renderTable = () => {
        // Ensure data is an array and filter by gender
        const maleData = Array.isArray(data) ? data.filter(row => row.gender === 'MALE') : [];
        const femaleData = Array.isArray(data) ? data.filter(row => row.gender === 'FEMALE') : [];

        // Render table for a specific gender
        const renderGenderTable = (genderData: any[], genderTitle: string) => {
            if (!genderData || genderData.length === 0) {
                return (
                    <div className="text-center p-4 bg-gray-100 rounded-md">
                        No {genderTitle} data available
                    </div>
                );
            }

            return (
                <div className="overflow-x-auto rounded-md border border-gray-200 mb-4">
                    <table className="w-full table-auto">
                        <thead className="sticky top-0 z-10 bg-[#4A628A] text-white">
                            <tr>
                                {columns.map(column => (
                                    <th
                                        key={column.id}
                                        className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider min-w-[150px]"
                                    >
                                        {column.header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {genderData.map((row, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    {columns.map(column => {
                                        let displayValue = row[column.accessorKey];
                                        
                                        // Special formatting for specific columns
                                        if (column.accessorKey === 'cost') {
                                            displayValue = `$${parseFloat(displayValue || '0').toFixed(2)}`;
                                        } else if (column.accessorKey === 'ctr') {
                                            displayValue = `${parseFloat(displayValue || '0').toFixed(2)}%`;
                                        }

                                        return (
                                            <td 
                                                key={column.id} 
                                                className="px-4 py-2.5 text-sm whitespace-nowrap"
                                            >
                                                {displayValue}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        };

        return (
            <>
                <h3 className="text-xl font-bold mb-4">Male Data</h3>
                {renderGenderTable(maleData, 'Male')}
                
                <h3 className="text-xl font-bold mb-4">Female Data</h3>
                {renderGenderTable(femaleData, 'Female')}
            </>
        );
    };

    return (
        <div>
            {viewMode === 'table' ? renderTable() : renderChart()}
            <Button onClick={toggleViewMode}>
                {viewMode === 'table' ? <BarChartIcon /> : <Table />}
            </Button>
        </div>
    );
};

export default GenderMetrics;
