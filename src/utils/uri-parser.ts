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
  const attioUriRegex = /^attio:\/\/([a-z]+)\/([a-zA-Z0-9_-]+)$/;
  const shorthandRegex = /^([a-z]+)\/([a-zA-Z0-9_-]+)$/;
  
  let matches = attioUriRegex.exec(uri);
  if (!matches) {
    matches = shorthandRegex.exec(uri);
  }
  
  if (!matches || matches.length < 3) {
    throw new Error(`Invalid Attio URI format: ${uri}`);
  }
  
  const resourceTypeStr = matches[1];
  const id = matches[2];
  
  // Validate resource type
  if (!Object.values(ResourceType).includes(resourceTypeStr as ResourceType)) {
    throw new Error(`Unknown resource type in URI: ${resourceTypeStr}`);
  }
  
  return [resourceTypeStr as ResourceType, id];
}