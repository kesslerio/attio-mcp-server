import { AttioNote } from "../../types/attio.js";
/**
 * Gets notes for a specific person
 *
 * @param personId - ID of the person
 * @param limit - Maximum number of notes to return (default: 10)
 * @param offset - Offset for pagination (default: 0)
 * @returns Array of notes
 */
export declare function getPersonNotes(personId: string, limit?: number, offset?: number): Promise<AttioNote[]>;
/**
 * Creates a note for a person
 *
 * @param personId - ID of the person
 * @param title - Title of the note
 * @param content - Content of the note
 * @returns Created note
 */
export declare function createPersonNote(personId: string, title: string, content: string): Promise<AttioNote>;
//# sourceMappingURL=notes.d.ts.map