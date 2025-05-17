import { DetailsToolConfig } from "../../tool-types.js";
export declare const formatterConfigs: {
    details: DetailsToolConfig;
    json: DetailsToolConfig;
    basicInfo: DetailsToolConfig;
    contactInfo: DetailsToolConfig;
    businessInfo: DetailsToolConfig;
    socialInfo: DetailsToolConfig;
};
export declare const formatterToolDefinitions: ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            companyId: {
                type: string;
                description: string;
            };
            uri: {
                type: string;
                description: string;
            };
        };
        oneOf: {
            required: string[];
        }[];
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            companyId: {
                type: string;
                description: string;
            };
            uri?: undefined;
        };
        required: string[];
        oneOf?: undefined;
    };
})[];
//# sourceMappingURL=formatters.d.ts.map