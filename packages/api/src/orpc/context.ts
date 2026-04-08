export interface ApiContext {
  headers: Headers;
}

export interface CreateApiContextInput {
  headers?: HeadersInit;
}

export async function createApiContext(
  input: CreateApiContextInput = {},
): Promise<ApiContext> {
  return {
    headers: new Headers(input.headers),
  };
}
