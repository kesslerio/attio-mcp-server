/**
 * Text based filter builders.
 */
// Internal imports
import { FilterConditionType, ATTRIBUTES, } from './types.js';
/**
 * Creates a phone number filter.
 */
export function createPhoneFilter(phoneCondition, phoneValue) {
    const filter = {
        attribute: { slug: ATTRIBUTES.PHONE },
        condition: phoneCondition,
        value: phoneValue,
    };
    if (phoneCondition === FilterConditionType.IS_EMPTY ||
        phoneCondition === FilterConditionType.IS_NOT_EMPTY) {
        delete filter.value;
    }
    return { filters: [filter], matchAny: false };
}
/**
 * Creates an email filter.
 */
export function createEmailFilter(emailCondition, emailValue) {
    const filter = {
        attribute: { slug: ATTRIBUTES.EMAIL },
        condition: emailCondition,
        value: emailValue,
    };
    if (emailCondition === FilterConditionType.IS_EMPTY ||
        emailCondition === FilterConditionType.IS_NOT_EMPTY) {
        delete filter.value;
    }
    return { filters: [filter], matchAny: false };
}
/**
 * Creates a filter for a specific industry.
 */
export function createIndustryFilter(industry, condition = FilterConditionType.EQUALS) {
    return {
        filters: [
            { attribute: { slug: ATTRIBUTES.INDUSTRY }, condition, value: industry },
        ],
        matchAny: false,
    };
}
