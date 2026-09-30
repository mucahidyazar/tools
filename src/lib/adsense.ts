export function adsensePublisherId(client: string | undefined): string | null {
  return /^ca-(pub-\d{16})$/.exec(client?.trim() ?? '')?.[1] ?? null
}

export function adsTxtRecord(client: string | undefined): string | null {
  const publisher = adsensePublisherId(client)
  return publisher ? `google.com, ${publisher}, DIRECT, f08c47fec0942fa0\n` : null
}
