/* Player reports of chat messages (spec S17). Kept in memory until the
   moderation tooling is built; each report names the room, message and reporter. */
export interface Report {
  roomCode: string
  messageSeq: number
  reporterId: string
  at: string
}

export interface ReportStore {
  add(report: Report): void
  list(): Report[]
}

export function createMemoryReports(): ReportStore {
  const reports: Report[] = []
  return {
    add: (report) => {
      reports.push(report)
    },
    list: () => [...reports],
  }
}
