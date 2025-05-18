import { AttioNote } from "../../types/attio.js";
/**
 * Gets notes for a specific company
 *
 * @param companyIdOrUri - The ID of the company or its URI (attio://companies/{id})
 * @param limit - Maximum number of notes to fetch (default: 10)
 * @param offset - Number of notes to skip (default: 0)
 * @returns Array of notes
 */
export declare function getCompanyNotes(companyIdOrUri: string, limit?: number, offset?: number): Promise<AttioNote[]>;
/**
 * Creates a note for a specific company
 *
 * @param companyIdOrUri - The ID of the company or its URI (attio://companies/{id})
 * @param title - The title of the note
 * @param content - The content of the note
 * @returns The created note
 */
export declare function createCompanyNote(companyIdOrUri: string, title: string, content: string): Promise<AttioNote>;
//# sourceMappingURL=notes.d.ts.map