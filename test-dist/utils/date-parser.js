/**
 * Date parsing utilities for natural language date expressions
 * Supports relative dates like "last week", "this month", etc.
 */
/**
 * Supported relative date formats
 */
export var RelativeDateFormat;
(function (RelativeDateFormat) {
    RelativeDateFormat["TODAY"] = "today";
    RelativeDateFormat["YESTERDAY"] = "yesterday";
    RelativeDateFormat["THIS_WEEK"] = "this week";
    RelativeDateFormat["LAST_WEEK"] = "last week";
    RelativeDateFormat["THIS_MONTH"] = "this month";
    RelativeDateFormat["LAST_MONTH"] = "last month";
    RelativeDateFormat["THIS_YEAR"] = "this year";
    RelativeDateFormat["LAST_YEAR"] = "last year";
    RelativeDateFormat["LAST_N_DAYS"] = "last {n} days";
    RelativeDateFormat["LAST_N_WEEKS"] = "last {n} weeks";
    RelativeDateFormat["LAST_N_MONTHS"] = "last {n} months";
})(RelativeDateFormat || (RelativeDateFormat = {}));
/**
 * Parse a relative date expression into a date range
 * @param expression Natural language date expression
 * @returns DateRange object with start and end dates
 * @throws Error if expression cannot be parsed
 */
export function parseRelativeDate(expression) {
    const normalized = expression.toLowerCase().trim();
    const now = new Date();
    // Helper to format date as ISO string (YYYY-MM-DD)
    const toISODate = (date) => {
        return date.toISOString().split('T')[0];
    };
    // Helper to get start of day
    const startOfDay = (date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    };
    // Helper to get start of week (Monday)
    const startOfWeek = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        return startOfDay(d);
    };
    // Helper to get end of week (Sunday)
    const endOfWeek = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? 0 : 7);
        d.setDate(diff);
        return startOfDay(d);
    };
    // Helper to get start of month
    const startOfMonth = (date) => {
        const d = new Date(date);
        d.setDate(1);
        return startOfDay(d);
    };
    // Helper to get end of month (last day of month)
    const endOfMonth = (date) => {
        const d = new Date(date);
        d.setMonth(d.getMonth() + 1, 0);
        return startOfDay(d);
    };
    // Helper to get start of year
    const startOfYear = (date) => {
        const d = new Date(date);
        d.setMonth(0, 1);
        return startOfDay(d);
    };
    // Helper to get end of year
    const endOfYear = (date) => {
        const d = new Date(date);
        d.setMonth(11, 31);
        return startOfDay(d);
    };
    // Parse specific relative dates
    switch (normalized) {
        case 'today': {
            const today = startOfDay(now);
            return {
                start: toISODate(today),
                end: toISODate(today),
            };
        }
        case 'yesterday': {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const startYesterday = startOfDay(yesterday);
            return {
                start: toISODate(startYesterday),
                end: toISODate(startYesterday),
            };
        }
        case 'this week': {
            return {
                start: toISODate(startOfWeek(now)),
                end: toISODate(endOfWeek(now)),
            };
        }
        case 'last week': {
            const lastWeek = new Date(now);
            lastWeek.setDate(lastWeek.getDate() - 7);
            return {
                start: toISODate(startOfWeek(lastWeek)),
                end: toISODate(endOfWeek(lastWeek)),
            };
        }
        case 'this month': {
            return {
                start: toISODate(startOfMonth(now)),
                end: toISODate(endOfMonth(now)),
            };
        }
        case 'last month': {
            const lastMonth = new Date(now);
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            return {
                start: toISODate(startOfMonth(lastMonth)),
                end: toISODate(endOfMonth(lastMonth)),
            };
        }
        case 'this year': {
            return {
                start: toISODate(startOfYear(now)),
                end: toISODate(endOfYear(now)),
            };
        }
        case 'last year': {
            const lastYear = new Date(now);
            lastYear.setFullYear(lastYear.getFullYear() - 1);
            return {
                start: toISODate(startOfYear(lastYear)),
                end: toISODate(endOfYear(lastYear)),
            };
        }
    }
    // Parse "last N days/weeks/months" patterns - handle spaces flexibly
    const lastNDaysMatch = normalized.match(/^last\s+(\d+)\s+days?$/);
    if (lastNDaysMatch) {
        const days = parseInt(lastNDaysMatch[1], 10);
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);
        return {
            start: toISODate(startOfDay(startDate)),
            end: toISODate(startOfDay(now)),
        };
    }
    const lastNWeeksMatch = normalized.match(/^last\s+(\d+)\s+weeks?$/);
    if (lastNWeeksMatch) {
        const weeks = parseInt(lastNWeeksMatch[1], 10);
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - weeks * 7);
        return {
            start: toISODate(startOfDay(startDate)),
            end: toISODate(startOfDay(now)),
        };
    }
    const lastNMonthsMatch = normalized.match(/^last\s+(\d+)\s+months?$/);
    if (lastNMonthsMatch) {
        const months = parseInt(lastNMonthsMatch[1], 10);
        const startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - months);
        return {
            start: toISODate(startOfDay(startDate)),
            end: toISODate(startOfDay(now)),
        };
    }
    // If no pattern matches, throw an error
    throw new Error(`Unable to parse relative date expression: "${expression}". ` +
        `Supported formats: today, yesterday, this week, last week, this month, ` +
        `last month, this year, last year, last N days/weeks/months`);
}
/**
 * Check if a string is a relative date expression
 * @param expression String to check
 * @returns true if the string is a recognized relative date expression
 */
export function isRelativeDate(expression) {
    try {
        parseRelativeDate(expression);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Convert a date string or relative expression to ISO date format
 * @param dateInput Date string or relative expression
 * @returns ISO date string or null if invalid
 */
export function normalizeDate(dateInput) {
    // Check if it's already an ISO date (YYYY-MM-DD)
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (isoDateRegex.test(dateInput)) {
        return dateInput;
    }
    // Check if it's a relative date
    if (isRelativeDate(dateInput)) {
        const range = parseRelativeDate(dateInput);
        // For single date context, return the start date
        return range.start;
    }
    // Try to parse as a regular date
    const date = new Date(dateInput);
    if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
    }
    return null;
}
/**
 * Get a human-readable description of a date range
 * @param range DateRange object
 * @returns Human-readable description
 */
export function describeDateRange(range) {
    // Parse dates as local dates to avoid timezone issues
    // Adding 'T00:00:00' ensures the date is interpreted in local time
    const start = new Date(range.start + 'T00:00:00');
    const end = new Date(range.end + 'T00:00:00');
    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };
    // Check if it's a single day
    if (range.start === range.end) {
        return formatDate(start);
    }
    return `${formatDate(start)} to ${formatDate(end)}`;
}
