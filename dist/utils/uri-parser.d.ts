import { ResourceType } from "../types/attio.js";
/**
 * Parse an Attio resource URI into resource type and ID
 *
 * @param uri - The URI to parse (format: attio://{type}/{id})
 * @returns Tuple of [resourceType, resourceId]
 * @throws Error if URI format is invalid
 */
export declare function parseResourceUri(uri: string): [ResourceType, string];
/**
 * Creates an Attio resource URI from a type and ID
 *
 * @param type - The resource type
 * @param id - The resource ID
 * @returns Formatted URI
 */
export declare function formatResourceUri(type: ResourceType, id: string): string;
//# sourceMappingURL=uri-parser.d.ts.map