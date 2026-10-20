import { useState, useCallback } from 'react'

export function useAsync(fn) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fn(...args)
      setData(res)
      return res
    } catch (err) {
      setError(err.message || 'An error occurred')
      throw err
    } finally {
      setLoading(false)
    }
  }, [fn])

  return { data, loading, error, execute }
}

export function useFetch(fn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fn()
      setData(res)
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refresh }
}
