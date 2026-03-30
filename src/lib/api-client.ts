/**
 * Centralized API client for frontend fetch calls.
 *
 * Provides consistent error handling and response parsing across hooks.
 */

export interface ApiResponse<T = unknown> {
  success?: boolean
  data?: T
  error?: string
  [key: string]: unknown
}

/**
 * Custom error class for API errors.
 * Contains the status code and full response data for inspection.
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public data: ApiResponse,
    message?: string
  ) {
    super(message || data.error || 'API request failed')
    this.name = 'ApiError'
  }
}

/**
 * Make an API request with standardized error handling.
 *
 * Throws ApiError if the response is not ok or if success is explicitly false.
 *
 * @example
 * ```typescript
 * try {
 *   const data = await apiRequest<ProductsResponse>('/api/products')
 *   setProducts(data.products)
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     setError(error.message)
 *   }
 * }
 * ```
 */
export async function apiRequest<T extends ApiResponse>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options)
  const data = (await response.json()) as T

  if (!response.ok || data.success === false) {
    throw new ApiError(response.status, data, data.error)
  }

  return data
}

/**
 * Make a POST request with JSON body.
 */
export async function apiPost<T extends ApiResponse>(
  url: string,
  body: Record<string, unknown>,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<T> {
  return apiRequest<T>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(body),
    ...options,
  })
}

/**
 * Make a PATCH request with JSON body.
 */
export async function apiPatch<T extends ApiResponse>(
  url: string,
  body: Record<string, unknown>,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<T> {
  return apiRequest<T>(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(body),
    ...options,
  })
}

/**
 * Make a DELETE request.
 */
export async function apiDelete<T extends ApiResponse>(
  url: string,
  options?: Omit<RequestInit, 'method'>
): Promise<T> {
  return apiRequest<T>(url, {
    method: 'DELETE',
    ...options,
  })
}

/**
 * Make a POST request with FormData body.
 * Used for file uploads.
 */
export async function apiPostForm<T extends ApiResponse>(
  url: string,
  formData: FormData,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<T> {
  return apiRequest<T>(url, {
    method: 'POST',
    body: formData,
    ...options,
  })
}

/**
 * Make a PATCH request with FormData body.
 * Used for file uploads on updates.
 */
export async function apiPatchForm<T extends ApiResponse>(
  url: string,
  formData: FormData,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<T> {
  return apiRequest<T>(url, {
    method: 'PATCH',
    body: formData,
    ...options,
  })
}
