export type WhatsAppFetch = typeof fetch;

export type WhatsAppApiConfig = {
  whatsAppAccessToken: string;
  phoneNumberId: string;
  fetch?: WhatsAppFetch;
  graphApiBaseUrl?: string;
  graphApiVersion?: string;
};

export type QueryValue = string | number | boolean | Date | null | string[] | Record<string, unknown>;

export type QueryResult<T> = {
  rows: T[];
  rowCount: number | null;
};

export type Queryable = {
  query<T = Record<string, unknown>>(text: string, values?: QueryValue[]): Promise<QueryResult<T>>;
};

