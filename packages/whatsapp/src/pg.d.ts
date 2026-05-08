declare module "pg" {
  export class Pool {
    constructor(config?: { connectionString?: string });
    query<T = Record<string, unknown>>(
      text: string,
      values?: unknown[]
    ): Promise<{ rows: T[]; rowCount: number | null }>;
  }
}
