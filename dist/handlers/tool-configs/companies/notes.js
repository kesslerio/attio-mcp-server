import { getCompanyNotes, createCompanyNote } from "../../../objects/companies/index.js";
// Company notes tool configurations
export const notesToolConfigs = {
    notes: {
        name: "get-company-notes",
        handler: getCompanyNotes,
        formatResult: (notes) => {
            if (!notes || notes.length === 0) {
                return 'No notes found for this company.';
            }
            return `Found ${notes.length} notes:\n${notes.map((note) => `- ${note.title || 'Untitled'} (Created: ${note.timestamp || 'unknown'})\n  ${note.content ? note.content.substring(0, 100) + '...' : 'No content'}`).join('\n\n')}`;
        }
    },
    createNote: {
        name: "create-company-note",
        handler: createCompanyNote,
        idParam: "companyId"
    }
};
// Notes tool definitions
export const notesToolDefinitions = [
    {
        name: "get-company-notes",
        description: "Get notes for a company",
        inputSchema: {
            type: "object",
            properties: {
                companyId: {
                    type: "string",
                    description: "ID of the company to get notes for"
                },
                uri: {
                    type: "string",
                    description: "URI of the company in the format 'attio://companies/{id}'"
                },
                limit: {
                    type: "number",
                    description: "Maximum number of notes to fetch (default: 10)"
                },
                offset: {
                    type: "number",
                    description: "Number of notes to skip for pagination (default: 0)"
                }
            },
            oneOf: [
                { required: ["companyId"] },
                { required: ["uri"] }
            ]
        }
    },
    {
        name: "create-company-note",
        description: "Create a note for a specific company",
        inputSchema: {
            type: "object",
            properties: {
                companyId: {
                    type: "string",
                    description: "ID of the company to create a note for"
                },
                uri: {
                    type: "string",
                    description: "URI of the company in the format 'attio://companies/{id}'"
                },
                title: {
                    type: "string",
                    description: "Title of the note (optional)"
                },
                content: {
                    type: "string",
                    description: "Content of the note"
                }
            },
            required: ["content"],
            oneOf: [
                { required: ["companyId"] },
                { required: ["uri"] }
            ]
        }
    }
];
//# sourceMappingURL=notes.js.map