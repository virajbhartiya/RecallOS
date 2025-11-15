import { useEffect, useState } from "react"
import { MemoryService } from "@/services/memory.service"
import { requireAuthToken } from "@/utils/user-id.util"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

type InboxItem = {
  id: string
  title: string | null
  summary: string | null
  url: string | null
  memory_type: string | null
  created_at: string
  importance_score?: number | null
  source?: string | null
  client_flags?: Record<string, unknown>
}

export const Inbox = () => {
  const navigate = useNavigate()
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actioningId, setActioningId] = useState<string | null>(null)

  useEffect(() => {
    try {
      requireAuthToken()
    } catch {
      navigate("/login")
      return
    }
    const abort = new AbortController()
    const load = async () => {
      try {
        setLoading(true)
        const data = await MemoryService.getInbox(abort.signal)
        setItems(data)
      } catch (error) {
        if (!abort.signal.aborted) {
          console.error("Failed to load inbox", error)
          toast.error("Failed to load memory inbox")
        }
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => abort.abort()
  }, [navigate])

  const handleUpdateFlags = async (id: string, flags: { reviewed?: boolean; pinned?: boolean }) => {
    try {
      setActioningId(id)
      await MemoryService.updateMemoryFlags(id, flags)
      setItems(prev =>
        prev
          .map(item =>
            item.id === id
              ? {
                  ...item,
                  client_flags: {
                    ...(item.client_flags || {}),
                    ...flags,
                  },
                }
              : item
          )
          .filter(item => !(flags.reviewed && item.id === id))
      )
      toast.success("Memory updated")
    } catch (error) {
      console.error("Failed to update memory flags", error)
      toast.error("Failed to update memory")
    } finally {
      setActioningId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-sm font-mono text-gray-600">Loading inbox…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 inset-x-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <button
                onClick={() => navigate("/")}
                className="text-sm font-medium text-gray-700 hover:text-black transition-colors"
              >
                ← Home
              </button>
              <div className="h-4 w-px bg-gray-300"></div>
              <div className="text-sm font-semibold text-gray-900">Memory Inbox</div>
              <div className="text-xs font-mono text-gray-500">{items.length} pending</div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate("/knowledge-health")}
                className="px-3 py-1.5 text-xs font-mono text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-300 transition-colors"
              >
                Knowledge Health
              </button>
              <button
                onClick={() => navigate("/memories")}
                className="px-3 py-1.5 text-xs font-mono text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-300 transition-colors"
              >
                Memories
              </button>
            </div>
          </div>
        </div>
      </header>
      <div className="h-14" aria-hidden="true" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {items.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-lg p-10 text-center text-sm text-gray-500">
            All caught up! No memories need review.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <article
                key={item.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {item.title || "Untitled memory"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(item.created_at).toLocaleString()} • {item.memory_type || "entry"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={actioningId === item.id}
                      onClick={() => handleUpdateFlags(item.id, { pinned: !(item.client_flags?.pinned === true) })}
                      className="px-3 py-1 text-xs font-medium border border-gray-300 text-gray-600 hover:text-black hover:border-black disabled:opacity-50"
                    >
                      {item.client_flags?.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button
                      disabled={actioningId === item.id}
                      onClick={() => handleUpdateFlags(item.id, { reviewed: true })}
                      className="px-3 py-1 text-xs font-medium bg-black text-white hover:bg-gray-900 disabled:opacity-50"
                    >
                      Mark Reviewed
                    </button>
                  </div>
                </div>
                {item.summary && (
                  <p className="mt-3 text-sm text-gray-700 line-clamp-3">{item.summary}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  {item.importance_score !== null && item.importance_score !== undefined && (
                    <span className="px-2 py-0.5 border border-gray-200 rounded-full">
                      Importance: {Math.round((item.importance_score || 0) * 100) / 100}
                    </span>
                  )}
                  {item.source && (
                    <span className="px-2 py-0.5 border border-gray-200 rounded-full">
                      Source: {item.source}
                    </span>
                  )}
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gray-600 hover:text-black underline underline-offset-2"
                    >
                      Open source
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default Inbox

