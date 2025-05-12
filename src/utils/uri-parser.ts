/**
 * Utilities for parsing Attio resource URIs
 */
import { ResourceType } from "../types/attio.js";

/**
 * Parses an Attio resource URI into its components
 * 
 * @param uri - The Attio resource URI (e.g., attio://people/abc123)
 * @returns Tuple of [resourceType, id]
 * @throws Error if the URI is invalid
 */
export function parseResourceUri(uri: string): [ResourceType, string] {
  if (!uri) {
    throw new Error("URI cannot be empty");
  }
  
  // Handle both full Attio URIs and shorthand forms
  const attioUriRegex = /^attio:\/\/([a-z]+)\/([a-zA-Z0-9_.-]+)$/;
  const shorthandRegex = /^([a-z]+)\/([a-zA-Z0-9_.-]+)$/;
  
  let matches = attioUriRegex.exec(uri);
  if (!matches) {
    matches = shorthandRegex.exec(uri);
  }
  
  if (!matches || matches.length < 3) {
    throw new Error(`Invalid resource URI format: ${uri}`);
  }
  
  const resourceTypeStr = matches[1];
  const id = matches[2];
  
  // Validate resource type
  if (!Object.values(ResourceType).includes(resourceTypeStr as ResourceType)) {
    throw new Error(`Unsupported resource type: ${resourceTypeStr}`);
  }
  
  return [resourceTypeStr as ResourceType, id];
}

/**
 * Formats a resource type and ID into an Attio resource URI
 * 
 * @param resourceType - The resource type (e.g., people, companies)
 * @param id - The resource ID
 * @returns Formatted URI (e.g., attio://people/abc123)
 */
export function formatResourceUri(resourceType: ResourceType, id: string): string {
  return `attio://${resourceType}/${id}`;
}