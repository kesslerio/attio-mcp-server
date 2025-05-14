/**
 * Validation utilities for filter inputs
 * Provides functions to validate and normalize filter parameters from user input
 */
import { 
  DateRange, 
  DateRangePreset, 
  ActivityFilter, 
  InteractionType, 
  NumericRange,
  FilterConditionType
} from "../types/attio.js";
import { FilterValidationError } from "../errors/api-errors.js";
import { isValidISODateString } from "./date-utils.js";

/**
 * Validates a date range object
 * 
 * @param dateRange - The date range to validate
 * @returns Validated and normalized date range
 * @throws FilterValidationError if validation fails
 */
export function validateDateRange(dateRange: any): DateRange {
  if (!dateRange) {
    throw new FilterValidationError('Date range is required');
  }

  // Normalize dateRange if it's a string
  if (typeof dateRange === 'string') {
    try {
      dateRange = JSON.parse(dateRange);
    } catch (error) {
      throw new FilterValidationError(
        `Invalid date range format: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  // Check if it's a proper object
  if (typeof dateRange !== 'object' || Array.isArray(dateRange)) {
    throw new FilterValidationError(
      'Date range must be an object with start, end, or preset properties'
    );
  }

  // Must have at least one of preset, start, or end
  if (!dateRange.preset && !dateRange.start && !dateRange.end) {
    throw new FilterValidationError(
      'Date range must specify at least one of: preset, start, or end'
    );
  }

  // Validate preset if provided
  if (dateRange.preset) {
    const normalizedPreset = typeof dateRange.preset === 'string' 
      ? dateRange.preset.toLowerCase().trim() 
      : String(dateRange.preset);
    
    const validPresets = Object.values(DateRangePreset);
    if (!validPresets.includes(normalizedPreset as DateRangePreset)) {
      throw new FilterValidationError(
        `Invalid date preset: "${dateRange.preset}". ` +
        `Valid presets are: ${validPresets.join(', ')}`
      );
    }
    
    // Normalize the preset to ensure proper casing
    dateRange.preset = normalizedPreset;
  }

  // Validate start date if provided
  if (dateRange.start) {
    if (typeof dateRange.start === 'string') {
      // Validate ISO string format
      if (!isValidISODateString(dateRange.start)) {
        throw new FilterValidationError(`Invalid ISO date string format for start date: ${dateRange.start}`);
      }
    } else if (typeof dateRange.start === 'object' && !Array.isArray(dateRange.start)) {
      // It's a relative date object, validate basic structure
      if (!dateRange.start.unit || !dateRange.start.value || !dateRange.start.direction) {
        throw new FilterValidationError(
          'Relative start date must have unit, value, and direction properties'
        );
      }
      
      // Validate value is a number
      if (typeof dateRange.start.value !== 'number' || isNaN(dateRange.start.value)) {
        throw new FilterValidationError('Relative date value must be a number');
      }
      
      // Validate direction
      if (dateRange.start.direction !== 'past' && dateRange.start.direction !== 'future') {
        throw new FilterValidationError('Relative date direction must be either "past" or "future"');
      }
    } else {
      throw new FilterValidationError(
        'Start date must be either an ISO date string or a relative date object'
      );
    }
  }

  // Validate end date if provided
  if (dateRange.end) {
    if (typeof dateRange.end === 'string') {
      // Validate ISO string format
      if (!isValidISODateString(dateRange.end)) {
        throw new FilterValidationError(`Invalid ISO date string format for end date: ${dateRange.end}`);
      }
    } else if (typeof dateRange.end === 'object' && !Array.isArray(dateRange.end)) {
      // It's a relative date object, validate basic structure
      if (!dateRange.end.unit || !dateRange.end.value || !dateRange.end.direction) {
        throw new FilterValidationError(
          'Relative end date must have unit, value, and direction properties'
        );
      }
      
      // Validate value is a number
      if (typeof dateRange.end.value !== 'number' || isNaN(dateRange.end.value)) {
        throw new FilterValidationError('Relative date value must be a number');
      }
      
      // Validate direction
      if (dateRange.end.direction !== 'past' && dateRange.end.direction !== 'future') {
        throw new FilterValidationError('Relative date direction must be either "past" or "future"');
      }
    } else {
      throw new FilterValidationError(
        'End date must be either an ISO date string or a relative date object'
      );
    }
  }

  return dateRange as DateRange;
}

/**
 * Validates an activity filter object
 * 
 * @param activityFilter - The activity filter to validate
 * @returns Validated and normalized activity filter
 * @throws FilterValidationError if validation fails
 */
export function validateActivityFilter(activityFilter: any): ActivityFilter {
  if (!activityFilter) {
    throw new FilterValidationError('Activity filter is required');
  }

  // Normalize if it's a string
  if (typeof activityFilter === 'string') {
    try {
      activityFilter = JSON.parse(activityFilter);
    } catch (error) {
      throw new FilterValidationError(
        `Invalid activity filter format: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  // Check if it's a proper object
  if (typeof activityFilter !== 'object' || Array.isArray(activityFilter)) {
    throw new FilterValidationError(
      'Activity filter must be an object with dateRange and optional interactionType'
    );
  }

  // Validate required dateRange property
  if (!activityFilter.dateRange) {
    throw new FilterValidationError('Activity filter must include a dateRange property');
  }
  
  // Validate dateRange
  try {
    activityFilter.dateRange = validateDateRange(activityFilter.dateRange);
  } catch (error) {
    throw new FilterValidationError(
      `Invalid dateRange in activity filter: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Validate interactionType if provided
  if (activityFilter.interactionType !== undefined) {
    const validTypes = Object.values(InteractionType);
    
    if (typeof activityFilter.interactionType !== 'string' || 
        !validTypes.includes(activityFilter.interactionType as InteractionType)) {
      throw new FilterValidationError(
        `Invalid interaction type: "${activityFilter.interactionType}". ` +
        `Valid types are: ${validTypes.join(', ')}`
      );
    }
  }

  return activityFilter as ActivityFilter;
}

/**
 * Validates a numeric range object
 * 
 * @param range - The numeric range to validate
 * @returns Validated and normalized numeric range
 * @throws FilterValidationError if validation fails
 */
export function validateNumericRange(range: any): NumericRange {
  if (!range) {
    throw new FilterValidationError('Numeric range is required');
  }

  // Normalize if it's a string
  if (typeof range === 'string') {
    try {
      range = JSON.parse(range);
    } catch (error) {
      throw new FilterValidationError(
        `Invalid numeric range format: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  // Check if it's a proper object
  if (typeof range !== 'object' || Array.isArray(range)) {
    throw new FilterValidationError(
      'Numeric range must be an object with min, max, or equals properties'
    );
  }

  // Must have at least one of min, max, or equals
  if (range.min === undefined && range.max === undefined && range.equals === undefined) {
    throw new FilterValidationError(
      'Numeric range must specify at least one of: min, max, or equals'
    );
  }

  // If equals is specified, min and max should not be
  if (range.equals !== undefined && (range.min !== undefined || range.max !== undefined)) {
    throw new FilterValidationError(
      'Cannot specify both equals and min/max in a numeric range'
    );
  }

  // Check types and convert to number if needed
  if (range.min !== undefined) {
    range.min = Number(range.min);
    if (isNaN(range.min)) {
      throw new FilterValidationError('Min value must be a valid number');
    }
  }

  if (range.max !== undefined) {
    range.max = Number(range.max);
    if (isNaN(range.max)) {
      throw new FilterValidationError('Max value must be a valid number');
    }
  }

  if (range.equals !== undefined) {
    range.equals = Number(range.equals);
    if (isNaN(range.equals)) {
      throw new FilterValidationError('Equals value must be a valid number');
    }
  }

  // Check that min <= max if both are specified
  if (range.min !== undefined && range.max !== undefined && range.min > range.max) {
    throw new FilterValidationError(
      `Invalid numeric range: min (${range.min}) cannot be greater than max (${range.max})`
    );
  }

  return range as NumericRange;
}

/**
 * Validates a filter condition string
 * 
 * @param condition - The condition to validate
 * @returns The validated condition
 * @throws FilterValidationError if validation fails
 */
export function validateFilterCondition(condition: string): FilterConditionType {
  if (!condition) {
    throw new FilterValidationError('Filter condition is required');
  }
  
  const validConditions = Object.values(FilterConditionType);
  if (!validConditions.includes(condition as FilterConditionType)) {
    throw new FilterValidationError(
      `Invalid filter condition: "${condition}". ` +
      `Valid conditions are: ${validConditions.join(', ')}`
    );
  }
  
  return condition as FilterConditionType;
}

/**
 * Ensures a value is a number, converting if necessary
 * 
 * @param value - The value to validate and convert
 * @param paramName - Name of the parameter (for error messages)
 * @param defaultValue - Optional default value if undefined
 * @returns The validated number
 * @throws FilterValidationError if validation fails
 */
export function validateNumericParam(
  value: any, 
  paramName: string, 
  defaultValue?: number
): number {
  if (value === undefined || value === null) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new FilterValidationError(`${paramName} is required`);
  }
  
  const num = Number(value);
  if (isNaN(num)) {
    throw new FilterValidationError(`${paramName} must be a valid number`);
  }
  
  return num;
}