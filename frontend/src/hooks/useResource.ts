import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

/** Loads a list resource and exposes a reload for after a mutation. */
export function useResource<T>(fetcher: () => Promise<T[]>) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await fetcher())
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [fetcher])

  useEffect(() => {
    void reload()
  }, [reload])

  return { rows, loading, reload }
}
