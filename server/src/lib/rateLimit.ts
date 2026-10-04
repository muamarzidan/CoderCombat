export class RateLimiter {
  private hits = new Map<string, number[]>()

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) { }

  allow(key: string): boolean {
    const now = Date.now()
    const cutoff = now - this.windowMs
    const recent = (this.hits.get(key) ?? []).filter(t => t > cutoff)

    if (recent.length >= this.limit) {
      this.hits.set(key, recent)
      return false
    }

    recent.push(now)
    this.hits.set(key, recent)
    if (this.hits.size > 10_000) this.sweep(cutoff)
    return true
  }

  reset(key: string): void {
    this.hits.delete(key)
  }

  private sweep(cutoff: number): void {
    for (const [key, times] of this.hits) {
      if (!times.some(t => t > cutoff)) this.hits.delete(key)
    }
  }
}
