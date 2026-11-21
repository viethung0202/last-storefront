import { useEffect, useState } from 'react'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.message ?? 'Request failed')
  }
  return data as T
}

export function useQuery<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  options: { enabled?: boolean; initialData: T },
) {
  const [data, setData] = useState<T>(options.initialData)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const enabled = options.enabled ?? true

  async function refetch() {
    if (!enabled) {
      return
    }
    setIsLoading(true)
    setError('')
    try {
      setData(await queryFn())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Request failed')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refetch()
  }, queryKey)

  return { data, error, isLoading, refetch, setData }
}

export function useMutation<TInput, TOutput>(
  mutationFn: (input: TInput) => Promise<TOutput>,
  options: {
    onSuccess?: (data: TOutput, input: TInput) => void | Promise<void>
    onError?: (message: string) => void
  } = {},
) {
  const [isPending, setIsPending] = useState(false)

  async function mutate(input: TInput) {
    setIsPending(true)
    try {
      const data = await mutationFn(input)
      await options.onSuccess?.(data, input)
      return data
    } catch (caught) {
      options.onError?.(caught instanceof Error ? caught.message : 'Request failed')
      throw caught
    } finally {
      setIsPending(false)
    }
  }

  return { mutate, isPending }
}
