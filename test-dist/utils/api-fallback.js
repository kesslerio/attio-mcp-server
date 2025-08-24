/**
 * Executes API calls with automatic fallback strategy for list operations
 *
 * Strategy:
 * 1. Try primary endpoint
 * 2. Try fallback POST endpoint with global query
 * 3. Try GET endpoint (only if no filters provided)
 *
 * @param api - API client instance
 * @param options - Fallback options
 * @param createRequestBody - Function to create request body
 * @param processEntries - Function to process response entries
 * @param logger - Logging function
 * @returns Processed list entries
 */
export async function executeWithListFallback(api, options, createRequestBody, processEntries, logger) {
    const { listId, filters, limit: safeLimit, offset: safeOffset } = options;
    // Primary endpoint attempt
    try {
        const path = `/lists/${listId}/entries/query`;
        const requestBody = createRequestBody();
        logger('Primary endpoint attempt', {
            path,
            requestBody: JSON.stringify(requestBody),
        });
        const response = await api.post(path, requestBody);
        logger('Primary endpoint successful', {
            resultCount: response.data.data?.length || 0,
        });
        return processEntries(response.data.data || []);
    }
    catch (primaryError) {
        const err = primaryError;
        logger('Primary endpoint failed', {
            error: err.message,
            status: err.response?.status,
        }, true);
        // Fallback endpoint attempt
        try {
            const fallbackPath = '/lists-entries/query';
            const fallbackBody = {
                ...createRequestBody(),
                list_id: listId,
            };
            logger('Fallback endpoint attempt', {
                path: fallbackPath,
                requestBody: JSON.stringify(fallbackBody),
            });
            const response = await api.post(fallbackPath, fallbackBody);
            logger('Fallback endpoint successful', {
                resultCount: response.data.data?.length || 0,
            });
            return processEntries(response.data.data || []);
        }
        catch (fallbackError) {
            const err = fallbackError;
            logger('Fallback endpoint failed', {
                error: err.message,
                status: err.response?.status,
            }, true);
            // GET endpoint as last resort (only if no filters)
            if (!filters || !filters.filters || filters.filters.length === 0) {
                try {
                    const params = new URLSearchParams();
                    params.append('list_id', listId);
                    params.append('expand', 'record');
                    params.append('limit', (safeLimit || 20).toString());
                    params.append('offset', (safeOffset || 0).toString());
                    const getPath = `/lists-entries?${params.toString()}`;
                    logger('GET fallback attempt', { path: getPath });
                    const response = await api.get(getPath);
                    logger('GET fallback successful', {
                        resultCount: response.data.data?.length || 0,
                    });
                    return processEntries(response.data.data || []);
                }
                catch (getError) {
                    const err = getError;
                    logger('GET fallback failed', {
                        error: err.message,
                        status: err.response?.status,
                    }, true);
                    // Throw the original primary error since it's most relevant
                    throw primaryError;
                }
            }
            else {
                // If filters were provided, don't try GET endpoint
                throw primaryError;
            }
        }
    }
}
