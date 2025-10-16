import { HttpClient } from '../http'
import type { ApiResponse, Pagination } from '../types'

export class ContentClient {
  constructor(private http: HttpClient) {}

  submitContent(body: { user_id: string; raw_text: string; metadata?: any }) {
    return this.http.post<ApiResponse<{ status: string; message: string; jobId: string; data: any }>>('/api/content', body)
  }

  getSummarizedContent(userId: string, opts?: { page?: number; limit?: number }) {
    return this.http.get<ApiResponse<{ content: Array<{ id: string; summary: string; created_at: string; original_text: string; original_text_length: number; title?: string | null; url?: string | null }>; pagination: Pagination }>>(`/api/content/user/${encodeURIComponent(userId)}`, opts as any)
  }
}


