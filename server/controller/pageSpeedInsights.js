import axios from 'axios';

const PAGE_SPEED_INSIGHTS_API_KEY = process.env.GOOGLE_API_KEY;

export const getPageSpeedInsights = async (req, res) => {
    try {
        // Validate request body
        const { url, format } = req.body;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'URL is required in the request body'
            });
        }

        // Validate API key
        if (!PAGE_SPEED_INSIGHTS_API_KEY) {
            console.error('[API] GOOGLE_API_KEY is not set in environment variables');
            return res.status(500).json({
                success: false,
                message: 'Google API key is not configured'
            });
        }

        // Map format to CrUX formFactor values
        const formFactor = format?.toUpperCase() || 'PHONE';
        
        // Validate formFactor
        const validFormFactors = ['PHONE', 'DESKTOP', 'TABLET'];
        if (!validFormFactors.includes(formFactor)) {
            return res.status(400).json({
                success: false,
                message: `Invalid format. Must be one of: ${validFormFactors.join(', ')}`
            });
        }

        // Clean URL - remove trailing slashes and ensure proper format
        let cleanUrl = url.trim();
        if (cleanUrl.endsWith('/')) {
            cleanUrl = cleanUrl.slice(0, -1);
        }

        // CrUX API endpoint
        const apiUrl = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${PAGE_SPEED_INSIGHTS_API_KEY}`;
        
        console.log('[API] Fetching CrUX data for:', cleanUrl, 'FormFactor:', formFactor);
        
        // Try multiple URL variations to handle www/non-www differences
        const urlVariations = getUrlVariations(cleanUrl);
        
        let speedInsights = null;
        let successUrl = null;
        let lastError = null;

        // Try each URL variation
        for (const urlVariant of urlVariations) {
            try {
                const requestBody = {
                    formFactor: formFactor,
                    origin: urlVariant
                };

                console.log('[API] Trying URL variant:', urlVariant);
                
                const response = await axios.post(apiUrl, requestBody, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                speedInsights = response;
                successUrl = urlVariant;
                console.log('[API] Success with URL:', urlVariant);
                break; // Found data, exit loop
                
            } catch (err) {
                lastError = err;
                console.log('[API] No data for variant:', urlVariant);
                continue; // Try next variation
            }
        }

        // If no variation worked, return 404
        if (!speedInsights) {
            console.error('[API] No CrUX data found for any URL variation');
            return res.status(404).json({
                success: false,
                message: 'No CrUX data available for this URL. The site may not have enough traffic or data.',
                error: 'URL not found in Chrome UX Report dataset',
                triedUrls: urlVariations,
                details: lastError?.response?.data
            });
        }
        
        // Parse the metrics matching the image format
        const parsedData = parseCruxMetrics(speedInsights.data);
        
        res.status(200).json({
            success: true,
            urlUsed: successUrl,
            formFactor: formFactor,
            data: {
                parsed: parsedData
            }
        });
        
    } catch (error) {
        console.error('[API] Error getting page speed insights:', error);
        
        const errorMessage = error.response?.data?.error?.message || error.message;
        const statusCode = error.response?.status || 500;
        
        res.status(statusCode).json({
            success: false,
            message: 'Error getting page speed insights',
            error: errorMessage,
            details: error.response?.data || undefined
        });
    }
}

// Helper function to generate URL variations
function getUrlVariations(url) {
    const variations = [];
    
    try {
        const urlObj = new URL(url);
        const protocol = urlObj.protocol; // http: or https:
        const hostname = urlObj.hostname;
        // Preserve pathname, search, and hash from original URL
        const pathAndQuery = urlObj.pathname + urlObj.search + urlObj.hash;
        
        // Add original URL
        variations.push(`${protocol}//${hostname}${pathAndQuery}`);
        
        // Handle www variations
        if (hostname.startsWith('www.')) {
            // If has www, also try without
            const withoutWww = hostname.replace('www.', '');
            variations.push(`${protocol}//${withoutWww}${pathAndQuery}`);
        } else {
            // If no www, also try with www
            variations.push(`${protocol}//www.${hostname}${pathAndQuery}`);
        }
        
        // If using http, also try https (and vice versa)
        const alternateProtocol = protocol === 'https:' ? 'http:' : 'https:';
        variations.push(`${alternateProtocol}//${hostname}${pathAndQuery}`);
        
        if (hostname.startsWith('www.')) {
            const withoutWww = hostname.replace('www.', '');
            variations.push(`${alternateProtocol}//${withoutWww}${pathAndQuery}`);
        } else {
            variations.push(`${alternateProtocol}//www.${hostname}${pathAndQuery}`);
        }
        
    } catch (e) {
        // If URL parsing fails, just return the original
        variations.push(url);
    }
    
    // Remove duplicates
    return [...new Set(variations)];
}

// Helper function to format date from CrUX API
// CrUX API returns dates as objects with {year, month, day} or ISO date strings
function formatDate(dateInput) {
    if (!dateInput) {
        return 'N/A';
    }

    let date;
    
    // Handle object format {year, month, day}
    if (typeof dateInput === 'object' && dateInput.year && dateInput.month && dateInput.day) {
        // CrUX API months are 1-indexed, but Date constructor expects 0-indexed months
        date = new Date(dateInput.year, dateInput.month - 1, dateInput.day);
    } 
    // Handle ISO date string format
    else if (typeof dateInput === 'string') {
        date = new Date(dateInput);
    } 
    // Handle Date object
    else if (dateInput instanceof Date) {
        date = dateInput;
    } 
    else {
        return 'Invalid date';
    }

    // Check if date is valid
    if (Number.isNaN(date.getTime())) {
        return 'Invalid date';
    }

    // Format as "Jan 1, 2024"
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();

    return `${month} ${day}, ${year}`;
}

// Helper function to parse CrUX metrics matching the PageSpeed Insights format
function parseCruxMetrics(cruxData) {
    if (!cruxData.record || !cruxData.record.metrics) {
        return null;
    }

    const metrics = cruxData.record.metrics;
    const parsed = {
        collectionPeriod: null,
        coreWebVitals: {},
        otherMetrics: {},
        assessment: null
    };

    // Parse collection period
    if (cruxData.record.collectionPeriod) {
        const period = cruxData.record.collectionPeriod;
        parsed.collectionPeriod = {
            firstDate: period.firstDate,
            lastDate: period.lastDate,
            formatted: `${formatDate(period.firstDate)} - ${formatDate(period.lastDate)}`
        };
    }

    // Parse LCP (Core Web Vital)
    if (metrics.largest_contentful_paint) {
        const lcp = metrics.largest_contentful_paint;
        const p75Value = lcp.percentiles.p75;
        
        // Extract thresholds from histogram bins
        const goodThreshold = lcp.histogram[0]?.end || 2500;
        const poorThreshold = lcp.histogram[1]?.end || 4000;
        
        parsed.coreWebVitals.LCP = {
            name: 'Largest Contentful Paint (LCP)',
            p75: `${(p75Value / 1000).toFixed(1)} s`,
            p75_ms: p75Value,
            status: p75Value <= goodThreshold ? 'good' : p75Value <= poorThreshold ? 'needs-improvement' : 'poor',
            distributions: {
                good: {
                    label: `Good (≤ ${(goodThreshold / 1000).toFixed(1)} s)`,
                    percentage: Math.round(lcp.histogram[0]?.density * 100) + '%',
                    value: lcp.histogram[0]?.density
                },
                needsImprovement: {
                    label: `Needs Improvement (${(goodThreshold / 1000).toFixed(1)} s - ${(poorThreshold / 1000).toFixed(1)} s)`,
                    percentage: Math.round(lcp.histogram[1]?.density * 100) + '%',
                    value: lcp.histogram[1]?.density
                },
                poor: {
                    label: `Poor (> ${(poorThreshold / 1000).toFixed(1)} s)`,
                    percentage: Math.round(lcp.histogram[2]?.density * 100) + '%',
                    value: lcp.histogram[2]?.density
                }
            }
        };
    }

    // Parse INP (Core Web Vital)
    if (metrics.interaction_to_next_paint) {
        const inp = metrics.interaction_to_next_paint;
        const p75Value = inp.percentiles.p75;
        
        // Extract thresholds from histogram bins
        const goodThreshold = inp.histogram[0]?.end || 200;
        const poorThreshold = inp.histogram[1]?.end || 500;
        
        parsed.coreWebVitals.INP = {
            name: 'Interaction to Next Paint (INP)',
            p75: `${p75Value} ms`,
            p75_ms: p75Value,
            status: p75Value <= goodThreshold ? 'good' : p75Value <= poorThreshold ? 'needs-improvement' : 'poor',
            distributions: {
                good: {
                    label: `Good (≤ ${goodThreshold} ms)`,
                    percentage: Math.round(inp.histogram[0]?.density * 100) + '%',
                    value: inp.histogram[0]?.density
                },
                needsImprovement: {
                    label: `Needs Improvement (${goodThreshold} ms - ${poorThreshold} ms)`,
                    percentage: Math.round(inp.histogram[1]?.density * 100) + '%',
                    value: inp.histogram[1]?.density
                },
                poor: {
                    label: `Poor (> ${poorThreshold} ms)`,
                    percentage: Math.round(inp.histogram[2]?.density * 100) + '%',
                    value: inp.histogram[2]?.density
                }
            }
        };
    }

    // Parse CLS (Core Web Vital)
    if (metrics.cumulative_layout_shift) {
        const cls = metrics.cumulative_layout_shift;
        const p75Value = cls.percentiles.p75 / 100; // Convert from 0-100 scale to 0-1
        
        // Extract thresholds from histogram bins (already in 0-100 scale, convert to 0-1)
        const goodThreshold = (cls.histogram[0]?.end || 10) / 100;
        const poorThreshold = (cls.histogram[1]?.end || 25) / 100;
        
        parsed.coreWebVitals.CLS = {
            name: 'Cumulative Layout Shift (CLS)',
            p75: p75Value.toFixed(2),
            p75_raw: p75Value,
            status: p75Value <= goodThreshold ? 'good' : p75Value <= poorThreshold ? 'needs-improvement' : 'poor',
            distributions: {
                good: {
                    label: `Good (≤ ${goodThreshold.toFixed(2)})`,
                    percentage: Math.round(cls.histogram[0]?.density * 100) + '%',
                    value: cls.histogram[0]?.density
                },
                needsImprovement: {
                    label: `Needs Improvement (${goodThreshold.toFixed(2)} - ${poorThreshold.toFixed(2)})`,
                    percentage: Math.round(cls.histogram[1]?.density * 100) + '%',
                    value: cls.histogram[1]?.density
                },
                poor: {
                    label: `Poor (> ${poorThreshold.toFixed(2)})`,
                    percentage: Math.round(cls.histogram[2]?.density * 100) + '%',
                    value: cls.histogram[2]?.density
                }
            }
        };
    }

    // Parse FCP (Other Notable Metric)
    if (metrics.first_contentful_paint) {
        const fcp = metrics.first_contentful_paint;
        const p75Value = fcp.percentiles.p75;
        
        // Extract thresholds from histogram bins
        const goodThreshold = fcp.histogram[0]?.end || 1800;
        const poorThreshold = fcp.histogram[1]?.end || 3000;
        
        parsed.otherMetrics.FCP = {
            name: 'First Contentful Paint (FCP)',
            p75: `${(p75Value / 1000).toFixed(1)} s`,
            p75_ms: p75Value,
            status: p75Value <= goodThreshold ? 'good' : p75Value <= poorThreshold ? 'needs-improvement' : 'poor',
            distributions: {
                good: {
                    label: `Good (≤ ${(goodThreshold / 1000).toFixed(1)} s)`,
                    percentage: Math.round(fcp.histogram[0]?.density * 100) + '%',
                    value: fcp.histogram[0]?.density
                },
                needsImprovement: {
                    label: `Needs Improvement (${(goodThreshold / 1000).toFixed(1)} s - ${(poorThreshold / 1000).toFixed(1)} s)`,
                    percentage: Math.round(fcp.histogram[1]?.density * 100) + '%',
                    value: fcp.histogram[1]?.density
                },
                poor: {
                    label: `Poor (> ${(poorThreshold / 1000).toFixed(1)} s)`,
                    percentage: Math.round(fcp.histogram[2]?.density * 100) + '%',
                    value: fcp.histogram[2]?.density
                }
            }
        };
    }

    // Parse TTFB (Other Notable Metric)
    if (metrics.experimental_time_to_first_byte) {
        const ttfb = metrics.experimental_time_to_first_byte;
        const p75Value = ttfb.percentiles.p75;
        
        // Extract thresholds from histogram bins
        const goodThreshold = ttfb.histogram[0]?.end || 800;
        const poorThreshold = ttfb.histogram[1]?.end || 1800;
        
        parsed.otherMetrics.TTFB = {
            name: 'Time to First Byte (TTFB)',
            p75: `${(p75Value / 1000).toFixed(1)} s`,
            p75_ms: p75Value,
            status: p75Value <= goodThreshold ? 'good' : p75Value <= poorThreshold ? 'needs-improvement' : 'poor',
            experimental: true,
            distributions: {
                good: {
                    label: `Good (≤ ${(goodThreshold / 1000).toFixed(1)} s)`,
                    percentage: Math.round(ttfb.histogram[0]?.density * 100) + '%',
                    value: ttfb.histogram[0]?.density
                },
                needsImprovement: {
                    label: `Needs Improvement (${(goodThreshold / 1000).toFixed(1)} s - ${(poorThreshold / 1000).toFixed(1)} s)`,
                    percentage: Math.round(ttfb.histogram[1]?.density * 100) + '%',
                    value: ttfb.histogram[1]?.density
                },
                poor: {
                    label: `Poor (> ${(poorThreshold / 1000).toFixed(1)} s)`,
                    percentage: Math.round(ttfb.histogram[2]?.density * 100) + '%',
                    value: ttfb.histogram[2]?.density
                }
            }
        };
    }

    // Calculate Core Web Vitals Assessment
    const coreVitals = parsed.coreWebVitals;
    const vitalsCount = Object.keys(coreVitals).length;
    
    if (vitalsCount > 0) {
        let passedCount = 0;
        
        Object.values(coreVitals).forEach(vital => {
            if (vital.status === 'good') {
                passedCount++;
            }
        });
        
        // Assessment: Pass if all vitals are good, otherwise fail
        parsed.assessment = {
            status: passedCount === vitalsCount ? 'PASSED' : 'FAILED',
            passedVitals: passedCount,
            totalVitals: vitalsCount,
            message: passedCount === vitalsCount 
                ? 'Core Web Vitals Assessment: Passed' 
                : 'Core Web Vitals Assessment: Failed'
        };
    }

    return parsed;
}