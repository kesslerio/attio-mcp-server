/**
 * Text based filter builders.
 */

// Internal imports
import {
  ATTRIBUTES,
  FilterConditionType,
  type ListEntryFilter,
  type ListEntryFilters,
} from './types.js';

/**
 * Creates a phone number filter.
 */
export function createPhoneFilter(
  phoneCondition: FilterConditionType,
  phoneValue?: string
): ListEntryFilters {
  const filter: ListEntryFilter = {
    attribute: { slug: ATTRIBUTES.PHONE },
    condition: phoneCondition,
    value: phoneValue,
  };

  if (
    phoneCondition === FilterConditionType.IS_EMPTY ||
    phoneCondition === FilterConditionType.IS_NOT_EMPTY
  ) {
    delete filter.value;
  }

  return { filters: [filter], matchAny: false };
}

/**
 * Creates an email filter.
 */
export function createEmailFilter(
  emailCondition: FilterConditionType,
  emailValue?: string
): ListEntryFilters {
  const filter: ListEntryFilter = {
    attribute: { slug: ATTRIBUTES.EMAIL },
    condition: emailCondition,
    value: emailValue,
  };

  if (
    emailCondition === FilterConditionType.IS_EMPTY ||
    emailCondition === FilterConditionType.IS_NOT_EMPTY
  ) {
    delete filter.value;
  }

  return { filters: [filter], matchAny: false };
}

/**
 * Creates a filter for a specific industry.
 */
export function createIndustryFilter(
  industry: string,
  condition: FilterConditionType = FilterConditionType.EQUALS
): ListEntryFilters {
  return {
    filters: [
      { attribute: { slug: ATTRIBUTES.INDUSTRY }, condition, value: industry },
    ],
    matchAny: false,
  };
}
