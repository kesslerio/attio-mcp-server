/**
 * Company-related functionality
 */
import { getAttioClient } from "../api/attio-client.js";
import { 
  searchObject, 
  listObjects, 
  getObjectDetails, 
  getObjectNotes, 
  createObjectNote 
} from "../api/attio-operations.js";
import { 
  ResourceType, 
  Company, 
  AttioNote 
} from "../types/attio.js";

/**
 * Searches for companies by name
 * 
 * @param query - Search query string
 * @returns Array of company results
 */
export async function searchCompanies(query: string): Promise<Company[]> {
  // Use the unified operation if available, with fallback to direct implementation
  try {
    return await searchObject<Company>(ResourceType.COMPANIES, query);
  } catch (error) {
    // Fallback implementation
    const api = getAttioClient();
    const path = "/objects/companies/records/query";
    
    const response = await api.post(path, {
      filter: {
        name: { "$contains": query },
      }
    });
    return response.data.data || [];
  }
}

/**
 * Lists companies sorted by most recent interaction
 * 
 * @param limit - Maximum number of companies to return (default: 20)
 * @returns Array of company results
 */
export async function listCompanies(limit: number = 20): Promise<Company[]> {
  // Use the unified operation if available, with fallback to direct implementation
  try {
    return await listObjects<Company>(ResourceType.COMPANIES, limit);
  } catch (error) {
    // Fallback implementation
    const api = getAttioClient();
    const path = "/objects/companies/records/query";
    
    const response = await api.post(path, {
      limit,
      sorts: [{ attribute: 'last_interaction', field: 'interacted_at', direction: 'desc' }]
    });
    return response.data.data || [];
  }
}

/**
 * Gets details for a specific company
 * 
 * @param companyId - The ID of the company
 * @returns Company details
 */
export async function getCompanyDetails(companyIdOrUri: string): Promise<Company> {
  // Check if the input is a URI format
  const isUri = companyIdOrUri.startsWith('attio://');
  let companyId = companyIdOrUri;
  
  // Extract the ID from URI if needed
  if (isUri) {
    // Parse the URI format (attio://companies/{id})
    const parts = companyIdOrUri.split('/');
    companyId = parts[parts.length - 1];
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Extracted company ID ${companyId} from URI ${companyIdOrUri}`);
    }
  }
  
  // Use the unified operation if available, with fallback to direct implementation
  try {
    return await getObjectDetails<Company>(ResourceType.COMPANIES, companyId);
  } catch (error: any) {
    const firstError = error;
    if (process.env.NODE_ENV === 'development') {
      console.log(`First attempt failed: ${firstError.message || 'Unknown error'}`);
    }
    
    try {
      // Try fallback implementation with explicit path
      const api = getAttioClient();
      const path = `/objects/companies/records/${companyId}`;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Trying fallback path: ${path}`);
      }
      
      const response = await api.get(path);
      return response.data;
    } catch (error: any) {
      const secondError = error;
      if (process.env.NODE_ENV === 'development') {
        console.log(`Second attempt failed: ${secondError.message || 'Unknown error'}`);
      }
      
      // Last resort - try the alternate endpoint format
      try {
        const api = getAttioClient();
        const alternatePath = `/companies/${companyId}`;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`Trying alternate path: ${alternatePath}`);
        }
        
        const response = await api.get(alternatePath);
        return response.data;
      } catch (error: any) {
        const thirdError = error;
        // If all attempts fail, throw a meaningful error
        throw new Error(`Could not retrieve company details for ${companyIdOrUri}: ${thirdError.message || 'Unknown error'}`);
      }
    }
  }
}

/**
 * Gets notes for a specific company
 * 
 * @param companyId - The ID of the company
 * @param limit - Maximum number of notes to fetch (default: 10)
 * @param offset - Number of notes to skip (default: 0)
 * @returns Array of notes
 */
export async function getCompanyNotes(companyId: string, limit: number = 10, offset: number = 0): Promise<AttioNote[]> {
  // Use the unified operation if available, with fallback to direct implementation
  try {
    return await getObjectNotes(ResourceType.COMPANIES, companyId, limit, offset);
  } catch (error) {
    // Fallback implementation
    const api = getAttioClient();
    const path = `/notes?limit=${limit}&offset=${offset}&parent_object=companies&parent_record_id=${companyId}`;
    
    const response = await api.get(path);
    return response.data.data || [];
  }
}

/**
 * Creates a note for a specific company
 * 
 * @param companyId - The ID of the company
 * @param title - The title of the note
 * @param content - The content of the note
 * @returns The created note
 */
export async function createCompanyNote(companyId: string, title: string, content: string): Promise<AttioNote> {
  // Use the unified operation if available, with fallback to direct implementation
  try {
    return await createObjectNote(ResourceType.COMPANIES, companyId, title, content);
  } catch (error) {
    // Fallback implementation
    const api = getAttioClient();
    const path = 'notes';
    
    const response = await api.post(path, {
      data: {
        format: "plaintext",
        parent_object: "companies",
        parent_record_id: companyId,
        title: `[AI] ${title}`,
        content
      },
    });
    return response.data;
  }
}
