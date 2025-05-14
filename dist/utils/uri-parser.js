import { ResourceType } from "../types/attio.js";
/**
 * Parse an Attio resource URI into resource type and ID
 *
 * @param uri - The URI to parse (format: attio://{type}/{id})
 * @returns Tuple of [resourceType, resourceId]
 * @throws Error if URI format is invalid
 */
export function parseResourceUri(uri) {
    const match = uri.match(/^attio:\/\/([^\/]+)\/(.+)$/);
    if (!match) {
        throw new Error(`Invalid resource URI format: ${uri}`);
    }
    const [, typeStr, id] = match;
    // Validate resource type
    if (!Object.values(ResourceType).includes(typeStr)) {
        throw new Error(`Unsupported resource type: ${typeStr}`);
    }
    return [typeStr, id];
}
/**
 * Creates an Attio resource URI from a type and ID
 *
 * @param type - The resource type
 * @param id - The resource ID
 * @returns Formatted URI
 */
export function formatResourceUri(type, id) {
    return `attio://${type}/${id}`;
}
//# sourceMappingURL=uri-parser.js.map