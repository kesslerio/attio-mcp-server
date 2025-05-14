/**
 * People-related functionality
 */
import { getAttioClient } from "../api/attio-client.js";
import { listObjects, getObjectDetails, getObjectNotes, createObjectNote, batchSearchObjects, batchGetObjectDetails } from "../api/attio-operations.js";
import { ResourceType } from "../types/attio.js";
import { createCreatedDateFilter, createModifiedDateFilter, createLastInteractionFilter, createActivityFilter } from "../utils/record-utils.js";
/**
 * Searches for people by name, email, or phone number
 *
 * @param query - Search query string
 * @returns Array of person results
 */
export async function searchPeople(query) {
    // Use the unified operation if available, with fallback to direct implementation
    try {
        return await searchPeopleByQuery(query);
    }
    catch (error) {
        // Just rethrow the error if it's from our own implementation
        if (error instanceof Error) {
            throw error;
        }
        // Fallback implementation
        try {
            const api = getAttioClient();
            const path = "/objects/people/records/query";
            // Use only the name filter as it's the most reliable
            // Email and phone are accessed through a nested structure
            const response = await api.post(path, {
                filter: {
                    name: { "$contains": query }
                }
            });
            return response.data.data || [];
        }
        catch (fallbackError) {
            // Ensure we pass through the original error
            throw fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
        }
    }
}
/**
 * Searches for people by name, email, or phone number using an OR filter
 *
 * @param query - Search query string
 * @returns Array of person results
 */
export async function searchPeopleByQuery(query) {
    const api = getAttioClient();
    const path = "/objects/people/records/query";
    try {
        // Use only name filter to avoid the 'unknown attribute slug: email' error
        // The API needs a different structure for accessing email and phone
        const response = await api.post(path, {
            filter: {
                name: { "$contains": query }
            }
        });
        // Post-processing to filter by email/phone if the query looks like it might be one
        let results = response.data.data || [];
        // If it looks like an email, do client-side filtering
        if (query.includes('@') && results.length > 0) {
            results = results.filter((person) => person.values?.email?.some((email) => email.value?.toLowerCase().includes(query.toLowerCase())));
        }
        return results;
    }
    catch (error) {
        throw error instanceof Error ? error : new Error(String(error));
    }
}
/**
 * Searches specifically for people by email
 *
 * @param email - Email address to search for
 * @returns Array of person results
 */
export async function searchPeopleByEmail(email) {
    const api = getAttioClient();
    const path = "/objects/people/records/query";
    try {
        // Fetch all people and filter client-side by email
        // This avoids the 'unknown attribute slug: email' error
        // In a production environment with many records, we would need pagination
        const response = await api.post(path, {
            // We're intentionally not filtering server-side due to API limitations
            // with the email attribute structure
            limit: 100 // Increased limit to get more potential matches
        });
        // Filter the results client-side by email
        const results = (response.data.data || []);
        return results.filter((person) => person.values?.email?.some((emailObj) => emailObj.value?.toLowerCase().includes(email.toLowerCase())));
    }
    catch (error) {
        throw error instanceof Error ? error : new Error(String(error));
    }
}
/**
 * Searches specifically for people by phone number
 *
 * @param phone - Phone number to search for
 * @returns Array of person results
 */
export async function searchPeopleByPhone(phone) {
    const api = getAttioClient();
    const path = "/objects/people/records/query";
    try {
        // Fetch all people and filter client-side by phone
        // This avoids the 'unknown attribute slug: phone' error
        // Similar approach to searchPeopleByEmail
        const response = await api.post(path, {
            // We're intentionally not filtering server-side due to API limitations
            // with the phone attribute structure
            limit: 100 // Increased limit to get more potential matches
        });
        // Filter the results client-side by phone
        const results = (response.data.data || []);
        return results.filter((person) => person.values?.phone?.some((phoneObj) => phoneObj.value?.toLowerCase().includes(phone.toLowerCase())));
    }
    catch (error) {
        throw error instanceof Error ? error : new Error(String(error));
    }
}
/**
 * Lists people sorted by most recent interaction
 *
 * @param limit - Maximum number of people to return (default: 20)
 * @returns Array of person results
 */
export async function listPeople(limit = 20) {
    // Use the unified operation if available, with fallback to direct implementation
    try {
        return await listObjects(ResourceType.PEOPLE, limit);
    }
    catch (error) {
        // Fallback implementation
        const api = getAttioClient();
        const path = "/objects/people/records/query";
        const response = await api.post(path, {
            limit,
            sorts: [{ attribute: 'last_interaction', field: 'interacted_at', direction: 'desc' }]
        });
        return response.data.data || [];
    }
}
/**
 * Gets details for a specific person
 *
 * @param personId - The ID of the person
 * @returns Person details
 */
export async function getPersonDetails(personId) {
    // Use the unified operation if available, with fallback to direct implementation
    try {
        return await getObjectDetails(ResourceType.PEOPLE, personId);
    }
    catch (error) {
        // If it's an error from the original implementation, just pass it through
        if (error instanceof Error) {
            throw error;
        }
        // Fallback implementation
        try {
            const api = getAttioClient();
            const path = `/objects/people/records/${personId}`;
            const response = await api.get(path);
            if (response && response.data) {
                return response.data;
            }
            throw new Error(`No data returned for person ${personId}`);
        }
        catch (fallbackError) {
            throw fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
        }
    }
}
/**
 * Gets notes for a specific person
 *
 * @param personId - The ID of the person
 * @param limit - Maximum number of notes to fetch (default: 10)
 * @param offset - Number of notes to skip (default: 0)
 * @returns Array of notes
 */
export async function getPersonNotes(personId, limit = 10, offset = 0) {
    // Use the unified operation if available, with fallback to direct implementation
    try {
        return await getObjectNotes(ResourceType.PEOPLE, personId, limit, offset);
    }
    catch (error) {
        // Fallback implementation
        try {
            const api = getAttioClient();
            const path = `/notes?limit=${limit}&offset=${offset}&parent_object=people&parent_record_id=${personId}`;
            const response = await api.get(path);
            return response.data.data || [];
        }
        catch (fallbackError) {
            throw fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
        }
    }
}
/**
 * Creates a note for a specific person
 *
 * @param personId - The ID of the person
 * @param title - The title of the note
 * @param content - The content of the note
 * @returns The created note
 */
export async function createPersonNote(personId, title, content) {
    // Use the unified operation if available, with fallback to direct implementation
    try {
        return await createObjectNote(ResourceType.PEOPLE, personId, title, content);
    }
    catch (error) {
        // Fallback implementation
        try {
            const api = getAttioClient();
            const path = 'notes';
            const response = await api.post(path, {
                data: {
                    format: "plaintext",
                    parent_object: "people",
                    parent_record_id: personId,
                    title: `[AI] ${title}`,
                    content
                },
            });
            return response.data;
        }
        catch (fallbackError) {
            throw fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
        }
    }
}
/**
 * Performs batch searches for people by name, email, or phone
 *
 * @param queries - Array of search query strings
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with search results for each query
 */
export async function batchSearchPeople(queries, batchConfig) {
    try {
        // Use the generic batch search objects operation
        return await batchSearchObjects(ResourceType.PEOPLE, queries, batchConfig);
    }
    catch (error) {
        // If the error is serious enough to abort the batch, rethrow it
        if (error instanceof Error) {
            throw error;
        }
        // Fallback implementation - execute each search individually and combine results
        const results = {
            results: [],
            summary: {
                total: queries.length,
                succeeded: 0,
                failed: 0
            }
        };
        // Process each query individually
        await Promise.all(queries.map(async (query, index) => {
            try {
                const people = await searchPeople(query);
                results.results.push({
                    id: `search_people_${index}`,
                    success: true,
                    data: people
                });
                results.summary.succeeded++;
            }
            catch (searchError) {
                results.results.push({
                    id: `search_people_${index}`,
                    success: false,
                    error: searchError
                });
                results.summary.failed++;
            }
        }));
        return results;
    }
}
/**
 * Gets details for multiple people in batch
 *
 * @param personIds - Array of person IDs to fetch
 * @param batchConfig - Optional batch configuration
 * @returns Batch response with person details for each ID
 */
export async function batchGetPeopleDetails(personIds, batchConfig) {
    try {
        // Use the generic batch get object details operation
        return await batchGetObjectDetails(ResourceType.PEOPLE, personIds, batchConfig);
    }
    catch (error) {
        // If the error is serious enough to abort the batch, rethrow it
        if (error instanceof Error) {
            throw error;
        }
        // Fallback implementation - execute each get operation individually and combine results
        const results = {
            results: [],
            summary: {
                total: personIds.length,
                succeeded: 0,
                failed: 0
            }
        };
        // Process each personId individually
        await Promise.all(personIds.map(async (personId) => {
            try {
                const person = await getPersonDetails(personId);
                results.results.push({
                    id: `get_people_${personId}`,
                    success: true,
                    data: person
                });
                results.summary.succeeded++;
            }
            catch (getError) {
                results.results.push({
                    id: `get_people_${personId}`,
                    success: false,
                    error: getError
                });
                results.summary.failed++;
            }
        }));
        return results;
    }
}
/**
 * Advanced search for people with filter capabilities
 *
 * @param filters - Filters to apply to the search
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching people
 */
export async function advancedSearchPeople(filters, limit = 20, offset = 0) {
    const api = getAttioClient();
    const path = "/objects/people/records/query";
    try {
        // Use the filters if provided, applying any transformations needed
        let transformedFilters = {};
        if (filters && filters.filters && filters.filters.length > 0) {
            const { filter } = require("../utils/record-utils.js").transformFiltersToApiFormat(filters);
            transformedFilters = { filter };
        }
        // Construct request with filters, limit, offset
        const requestBody = {
            ...transformedFilters,
            limit,
            offset
        };
        const response = await api.post(path, requestBody);
        // Handle special case for email/phone filtering which might need client-side processing
        let results = response.data.data || [];
        // Determine if we need client-side filtering for email or phone
        const needsEmailFiltering = filters?.filters?.some(f => f.attribute?.slug === 'email');
        const needsPhoneFiltering = filters?.filters?.some(f => f.attribute?.slug === 'phone');
        // Apply client-side filtering if needed
        if (needsEmailFiltering) {
            // Extract the email filter value and condition
            const emailFilter = filters?.filters?.find(f => f.attribute?.slug === 'email');
            const emailValue = emailFilter?.value;
            const emailCondition = emailFilter?.condition;
            if (emailValue && typeof emailValue === 'string') {
                results = results.filter((person) => {
                    if (!person.values?.email)
                        return false;
                    // Get all email values for this person
                    const emails = person.values.email.map(e => e.value?.toLowerCase());
                    // Apply the appropriate condition
                    switch (emailCondition) {
                        case 'equals':
                            return emails.some(e => e === emailValue.toLowerCase());
                        case 'contains':
                            return emails.some(e => e?.includes(emailValue.toLowerCase()));
                        case 'starts_with':
                            return emails.some(e => e?.startsWith(emailValue.toLowerCase()));
                        case 'ends_with':
                            return emails.some(e => e?.endsWith(emailValue.toLowerCase()));
                        default:
                            return emails.some(e => e?.includes(emailValue.toLowerCase()));
                    }
                });
            }
        }
        if (needsPhoneFiltering) {
            // Extract the phone filter value and condition
            const phoneFilter = filters?.filters?.find(f => f.attribute?.slug === 'phone');
            const phoneValue = phoneFilter?.value;
            const phoneCondition = phoneFilter?.condition;
            if (phoneValue && typeof phoneValue === 'string') {
                const normalizedPhoneValue = phoneValue.replace(/[^0-9+]/g, '');
                results = results.filter((person) => {
                    if (!person.values?.phone)
                        return false;
                    // Get all phone values for this person
                    const phones = person.values.phone.map(p => {
                        return p.value?.replace(/[^0-9+]/g, '');
                    });
                    // Apply the appropriate condition
                    switch (phoneCondition) {
                        case 'equals':
                            return phones.some(p => p === normalizedPhoneValue);
                        case 'contains':
                            return phones.some(p => p?.includes(normalizedPhoneValue));
                        case 'starts_with':
                            return phones.some(p => p?.startsWith(normalizedPhoneValue));
                        case 'ends_with':
                            return phones.some(p => p?.endsWith(normalizedPhoneValue));
                        default:
                            return phones.some(p => p?.includes(normalizedPhoneValue));
                    }
                });
            }
        }
        return results;
    }
    catch (error) {
        throw error instanceof Error ? error : new Error(String(error));
    }
}
/**
 * Search for people by creation date
 *
 * @param dateRange - Date range to filter by (when people were created)
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching people
 */
export async function searchPeopleByCreationDate(dateRange, limit = 20, offset = 0) {
    const filters = createCreatedDateFilter(dateRange);
    return advancedSearchPeople(filters, limit, offset);
}
/**
 * Search for people by last modification date
 *
 * @param dateRange - Date range to filter by (when people were last modified)
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching people
 */
export async function searchPeopleByModificationDate(dateRange, limit = 20, offset = 0) {
    const filters = createModifiedDateFilter(dateRange);
    return advancedSearchPeople(filters, limit, offset);
}
/**
 * Search for people by last interaction date
 *
 * @param dateRange - Date range to filter by (when the last interaction occurred)
 * @param interactionType - Optional type of interaction to filter by
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching people
 */
export async function searchPeopleByLastInteraction(dateRange, interactionType, limit = 20, offset = 0) {
    const filters = createLastInteractionFilter(dateRange, interactionType);
    return advancedSearchPeople(filters, limit, offset);
}
/**
 * Search for people by activity history
 * Combines date range and interaction type filters
 *
 * @param activityFilter - Activity filter configuration
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip (default: 0)
 * @returns Array of matching people
 */
export async function searchPeopleByActivity(activityFilter, limit = 20, offset = 0) {
    const filters = createActivityFilter(activityFilter);
    return advancedSearchPeople(filters, limit, offset);
}
//# sourceMappingURL=people.js.map