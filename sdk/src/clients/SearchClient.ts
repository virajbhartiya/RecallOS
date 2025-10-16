import { HttpClient } from '../http'
import type { SearchPostResponse, SearchJob } from '../types'

export class SearchClient {
  constructor(private http: HttpClient) {}

  postSearch(body: { wallet: string; query: string; limit?: number }) {
    return this.http.post<SearchPostResponse>('/api/search', body)
  }

  getSearchJobStatus(id: string) {
    // Hint: job status should bypass caches
    return this.http.get<SearchJob>(`/api/search/job/${encodeURIComponent(id)}`, {}, { headers: { 'Cache-Control': 'no-store' } })
  }
}


