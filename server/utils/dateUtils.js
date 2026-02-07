/**
 * Date utility functions for consistent date parsing and validation
 */

export function parseDate(dateString) {
    if (!dateString) return null;
    
    try {
        const [year, month, day] = dateString.split('-').map(Number);
        
        // Validate date components
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
            return null;
        }
        
        // Create UTC date to avoid timezone issues
        return new Date(Date.UTC(year, month - 1, day));
    } catch (error) {
        return null;
    }
}

/**
 * Validate date range
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @param {Date} today - Today's date (for future date validation)
 * @param {number} maxDays - Maximum allowed days in range (default: 365)
 * @returns {Object} Validation result with isValid and message
 */
export function validateDateRange(start, end, today, maxDays = 365) {
    if (!start || !end) {
        return {
            isValid: false,
            message: 'Both startDate and endDate are required'
        };
    }
    
    if (start > end) {
        return {
            isValid: false,
            message: 'startDate must be before endDate'
        };
    }
    
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (daysDiff > maxDays) {
        return {
            isValid: false,
            message: `Date range cannot exceed ${maxDays} days`
        };
    }
    
    if (end > today) {
        return {
            isValid: false,
            message: 'endDate cannot be in the future'
        };
    }
    
    return {
        isValid: true,
        message: null
    };
}

