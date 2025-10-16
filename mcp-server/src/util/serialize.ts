export function toJSONSafe<T>(value: T): any {
  return JSON.parse(JSON.stringify(value, (_key, val) => {
    if (typeof val === 'bigint') return val.toString()
    return val
  }))
}


