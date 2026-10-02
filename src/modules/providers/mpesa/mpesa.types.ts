/**
 * Daraja OAuth 2.0 Token Response
 */
export interface MpesaOAuthResponse {
  access_token: string;
  expires_in: string;
}

/**
 * Daraja B2C Payment Request Payload
 */
export interface MpesaB2CPayload {
  InitiatorName: string;
  SecurityCredential: string;
  CommandID: "BusinessPayment" | "SalaryPayment" | "PromotionPayment";
  Amount: number;
  PartyA: string;
  PartyB: string;
  Remarks: string;
  QueueTimeOutURL: string;
  ResultURL: string;
  Occasion?: string;
  OriginatorConversationID: string;
}

/**
 * Daraja B2C Synchronous Initial Acknowledgment Response
 */
export interface MpesaB2CAcknowledgment {
  ConversationID: string;
  OriginatorConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

/**
 * Result Parameter Key-Value entry from Daraja callback
 */
export interface MpesaResultParameter {
  Key: string;
  Value: string | number;
}

/**
 * Daraja B2C Asynchronous Result Callback Schema
 */
export interface MpesaB2CCallbackResult {
  ResultType: number;
  ResultCode: number;
  ResultDesc: string;
  OriginatorConversationID: string;
  ConversationID: string;
  TransactionID?: string;
  ResultParameters?: {
    ResultParameter?: MpesaResultParameter[];
  };
  ReferenceData?: {
    ReferenceItem?: {
      Key: string;
      Value: string;
    };
  };
}

export interface MpesaB2CCallbackPayload {
  Result: MpesaB2CCallbackResult;
}

/**
 * Daraja Transaction Status Query Request Payload
 */
export interface MpesaStatusQueryPayload {
  Initiator: string;
  SecurityCredential: string;
  CommandID: "TransactionStatusQuery";
  TransactionID?: string;
  OriginatorConversationID?: string;
  PartyA: string;
  IdentifierType: "4" | "1";
  ResultURL: string;
  QueueTimeOutURL: string;
  Remarks: string;
  Occasion?: string;
}

/**
 * Connectivity diagnostic probe response
 */
export interface MpesaConnectivityResult {
  connected: boolean;
  latencyMs?: number;
  error?: string;
}
