import { type CreateLeadInput } from "@abdulmuiz44/clientpad-sdk";
import type { WhatsAppApiConfig, WhatsAppFetch } from "./types.js";
export type ServiceBusinessFlowConfig = WhatsAppApiConfig & {
    clientpadBaseUrl: string;
    clientpadApiKey: string;
    verifyToken: string;
    source?: string;
    defaultServiceInterest?: string;
    status?: CreateLeadInput["status"];
    replyText?: string;
    createLead?: boolean;
    fetch?: WhatsAppFetch;
};
export declare function createServiceBusinessFlow(config: ServiceBusinessFlowConfig): (request: Request) => Promise<Response>;
//# sourceMappingURL=service-flow.d.ts.map