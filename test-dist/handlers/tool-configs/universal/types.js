/**
 * Universal tool type definitions for consolidated MCP operations
 *
 * These types support the universal tool consolidation effort to reduce
 * tool count from 70 to ~30 tools while maintaining full functionality.
 */
/**
 * Supported resource types for universal operations
 */
export var UniversalResourceType;
(function (UniversalResourceType) {
    UniversalResourceType["COMPANIES"] = "companies";
    UniversalResourceType["PEOPLE"] = "people";
    UniversalResourceType["LISTS"] = "lists";
    UniversalResourceType["RECORDS"] = "records";
    UniversalResourceType["TASKS"] = "tasks";
    UniversalResourceType["DEALS"] = "deals";
    UniversalResourceType["NOTES"] = "notes";
})(UniversalResourceType || (UniversalResourceType = {}));
/**
 * Information types for detailed info retrieval
 */
export var DetailedInfoType;
(function (DetailedInfoType) {
    DetailedInfoType["CONTACT"] = "contact";
    DetailedInfoType["BUSINESS"] = "business";
    DetailedInfoType["SOCIAL"] = "social";
    DetailedInfoType["BASIC"] = "basic";
    DetailedInfoType["CUSTOM"] = "custom";
})(DetailedInfoType || (DetailedInfoType = {}));
/**
 * Operation types for batch operations
 */
export var BatchOperationType;
(function (BatchOperationType) {
    BatchOperationType["CREATE"] = "create";
    BatchOperationType["UPDATE"] = "update";
    BatchOperationType["DELETE"] = "delete";
    BatchOperationType["SEARCH"] = "search";
    BatchOperationType["GET"] = "get";
})(BatchOperationType || (BatchOperationType = {}));
/**
 * Temporal filter types for timeframe searches
 */
export var TimeframeType;
(function (TimeframeType) {
    TimeframeType["CREATED"] = "created";
    TimeframeType["MODIFIED"] = "modified";
    TimeframeType["LAST_INTERACTION"] = "last_interaction";
})(TimeframeType || (TimeframeType = {}));
/**
 * Content search types for content-based searches
 */
export var ContentSearchType;
(function (ContentSearchType) {
    ContentSearchType["NOTES"] = "notes";
    ContentSearchType["ACTIVITY"] = "activity";
    ContentSearchType["INTERACTIONS"] = "interactions";
})(ContentSearchType || (ContentSearchType = {}));
/**
 * Relationship search types for cross-entity searches
 */
export var RelationshipType;
(function (RelationshipType) {
    RelationshipType["COMPANY_TO_PEOPLE"] = "company_to_people";
    RelationshipType["PEOPLE_TO_COMPANY"] = "people_to_company";
    RelationshipType["PERSON_TO_TASKS"] = "person_to_tasks";
    RelationshipType["COMPANY_TO_TASKS"] = "company_to_tasks";
})(RelationshipType || (RelationshipType = {}));
/**
 * Search type options for content search
 */
export var SearchType;
(function (SearchType) {
    SearchType["BASIC"] = "basic";
    SearchType["CONTENT"] = "content";
})(SearchType || (SearchType = {}));
/**
 * Match type options for search matching
 */
export var MatchType;
(function (MatchType) {
    MatchType["EXACT"] = "exact";
    MatchType["PARTIAL"] = "partial";
    MatchType["FUZZY"] = "fuzzy";
})(MatchType || (MatchType = {}));
/**
 * Sort options for search results
 */
export var SortType;
(function (SortType) {
    SortType["RELEVANCE"] = "relevance";
    SortType["CREATED"] = "created";
    SortType["MODIFIED"] = "modified";
    SortType["NAME"] = "name";
})(SortType || (SortType = {}));
