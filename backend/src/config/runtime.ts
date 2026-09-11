export const processStartedAt = new Date();

export function processUptimeSeconds(): number {
  return Math.floor(process.uptime());
}
