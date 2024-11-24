export const enum Time {
  MS = 1,
  Second = 1000,
  Minute = 60 * 1000,
  Hour = 60 * 60 * 1000,
  Day = 24 * 60 * 60 * 1000
}

export function sleep(time: Time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}
