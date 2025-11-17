type PauseMetadata = {
  code?: number | string
  status?: string
  message?: string
}

type ActivePauseInfo = {
  remainingMs: number
  resumeAtIso: string
  resumeAtPst: string
  metadata?: PauseMetadata | null
}

const PST_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

class MemoryProcessingPauseService {
  private pausedUntil = 0
  private metadata: PauseMetadata | null = null
  private resumePromise: Promise<void> | null = null
  private resumeResolve: (() => void) | null = null
  private resumeTimer: NodeJS.Timeout | null = null

  isPaused(): boolean {
    return Date.now() < this.pausedUntil
  }

  getActivePause(): ActivePauseInfo | null {
    if (!this.isPaused()) {
      return null
    }
    const remainingMs = Math.max(0, this.pausedUntil - Date.now())
    const resumeDate = new Date(this.pausedUntil)
    return {
      remainingMs,
      resumeAtIso: resumeDate.toISOString(),
      resumeAtPst: PST_FORMATTER.format(resumeDate),
      metadata: this.metadata,
    }
  }

  pauseFor(durationMs: number, metadata?: PauseMetadata): ActivePauseInfo {
    const base = Math.max(Date.now(), this.pausedUntil)
    this.pausedUntil = base + durationMs
    this.metadata = metadata || null
    this.scheduleResumeNotifier()
    return this.getActivePause()!
  }

  async waitIfPaused(): Promise<void> {
    if (!this.isPaused()) {
      return
    }
    await this.waitForResume()
  }

  async waitForResume(): Promise<void> {
    if (!this.isPaused()) {
      return
    }
    if (!this.resumePromise) {
      this.scheduleResumeNotifier()
    }
    await this.resumePromise
  }

  private scheduleResumeNotifier(): void {
    if (!this.isPaused()) {
      this.resolveResumePromise()
      return
    }

    if (this.resumeTimer) {
      clearTimeout(this.resumeTimer)
      this.resumeTimer = null
    }

    if (!this.resumePromise) {
      this.resumePromise = new Promise<void>(resolve => {
        this.resumeResolve = resolve
      })
    }

    const delay = Math.max(0, this.pausedUntil - Date.now())
    this.resumeTimer = setTimeout(() => {
      this.resumeTimer = null
      this.resolveResumePromise()
    }, delay)
  }

  private resolveResumePromise(): void {
    if (this.resumeResolve) {
      this.resumeResolve()
      this.resumeResolve = null
    }
    this.resumePromise = null
    this.metadata = null
    this.pausedUntil = 0
  }
}

export const memoryProcessingPauseService = new MemoryProcessingPauseService()
