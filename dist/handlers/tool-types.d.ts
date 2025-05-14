/**
 * Common types for tool configurations
 */
import { Request, Response } from "express";
import { AttioRecord, AttioNote, AttioList, AttioListEntry } from "../types/attio.js";
import { ListEntryFilters } from "../api/attio-operations.js";
export interface ToolConfig {
    name: string;
    handler: any;
    formatResult?: (results: any) => string;
}
export interface SearchToolConfig extends ToolConfig {
    handler: (query: string) => Promise<AttioRecord[]>;
    formatResult: (results: AttioRecord[]) => string;
}
export interface AdvancedSearchToolConfig extends ToolConfig {
    handler: (filters: ListEntryFilters, limit?: number, offset?: number) => Promise<AttioRecord[]>;
    formatResult: (results: AttioRecord[]) => string;
}
export interface DetailsToolConfig extends ToolConfig {
    handler: (id: string) => Promise<AttioRecord>;
}
export interface NotesToolConfig extends ToolConfig {
    handler: (id: string) => Promise<AttioNote[]>;
}
export interface CreateNoteToolConfig extends ToolConfig {
    handler: (id: string, title: string, content: string) => Promise<AttioNote>;
    idParam?: string;
}
export interface GetListsToolConfig extends ToolConfig {
    handler: () => Promise<AttioList[]>;
}
export interface GetListEntriesToolConfig extends ToolConfig {
    handler: (listId: string) => Promise<AttioListEntry[]>;
}
export interface ListActionToolConfig extends ToolConfig {
    handler: (listId: string, recordId: string) => Promise<any>;
    idParams?: string[];
}
export interface PromptsToolConfig extends ToolConfig {
    handler: (req: Request, res: Response) => Promise<void>;
}
export interface AdvancedSearchToolConfig extends ToolConfig {
    handler: (...args: any[]) => Promise<AttioRecord[]>;
    formatResult: (results: AttioRecord[]) => string;
}
//# sourceMappingURL=tool-types.d.ts.map