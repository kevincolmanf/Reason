export async function broadcastPortalRefresh(patientId: string): Promise<void> {
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`,
      {
        method: 'POST',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ topic: `portal:${patientId}`, event: 'refresh', payload: {} }],
        }),
      }
    )
  } catch {
    // non-critical: portal falls back to 3-minute reload interval
  }
}
