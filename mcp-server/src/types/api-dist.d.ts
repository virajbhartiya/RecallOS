declare module '../../../api/dist/src/lib/prisma.js' {
  export const prisma: any
}
declare module '../../../api/dist/src/services/memoryMesh.js' {
  export const memoryMeshService: any
}
declare module '../../../api/dist/src/services/memorySearch.js' {
  export function searchMemories(input: any): Promise<any>
}
declare module '../../../api/dist/src/services/searchJob.js' {
  export function getSearchJob(id: string): Promise<any>
}
declare module '../../../api/dist/src/services/blockscoutPrefetch.js' {
  const svc: any
  export default svc
}
declare module '../../../api/dist/src/lib/queue.js' {
  export function addContentJob(data: any): Promise<any>
}

