export async function handle(request, env = name => Deno.env.get(name), fetcher = fetch) {
  const reply = (body, status = 200) => Response.json(body, { status });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  if (request.headers.get('apikey') !== 'sb_publishable_j7q6Ox0GVsUv68D3oQiOBA_2Avx50il') return reply({ error: 'Invalid API key' }, 401);
  let row;
  try { row = await request.json(); } catch { return reply({ error: 'Invalid request' }, 400); }
  if (!/^[0-9a-f-]{36}$/i.test(row?.submission_id || '') || typeof row.full_name !== 'string' || row.full_name.length > 120 || typeof row.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) || row.email.length > 254 || typeof row.phone !== 'string' || row.phone.length > 40 || !Array.isArray(row.slots) || !row.slots.length || row.slots.length > 5 || row.slots.some(slot => !Number.isInteger(slot) || slot < 1 || slot > 5)) return reply({ error: 'Invalid notification' }, 400);
  const key = env('RESEND_API_KEY');
  const configuredFrom = env('REMINDER_EMAIL_FROM');
  if (!key || !configuredFrom) return reply({ error: 'Email unavailable' }, 503);
  const sender = (configuredFrom.match(/<([^<>]+)>/)?.[1] || configuredFrom).trim();
  const text = `Chanukah Carnival - November 8th\n\nName: ${row.full_name}\nEmail: ${row.email}\nCell: ${row.phone}\n\nSet Up Game Booths 8:00 - 10:00 AM\nSelected options: ${row.slots.join(', ')}`;
  try {
    const response = await fetcher('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', 'Idempotency-Key': 'chanukah-carnival/' + row.submission_id }, body: JSON.stringify({ from: 'Chanukah Carnival <' + sender + '>', to: ['esemmoc@gmail.com'], subject: 'Chanukah Carnival - November 8th signup', text, reply_to: row.email }), signal: AbortSignal.timeout(25000) });
    if (!response.ok) return reply({ error: 'Email rejected' }, 502);
    const sent = await response.json();
    return sent.id ? reply({ id: sent.id }) : reply({ error: 'Email not confirmed' }, 502);
  } catch { return reply({ error: 'Email unavailable' }, 502); }
}
if (import.meta.main) Deno.serve(request => handle(request));
