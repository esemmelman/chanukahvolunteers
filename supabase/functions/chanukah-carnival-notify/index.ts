const BROWSER_KEY = 'sb_publishable_JOUqLZDnfGu_yCa6k6FVDQ_AYwpr72i';
const headers = { 'Access-Control-Allow-Origin': 'https://esemmelman.github.io', 'Access-Control-Allow-Headers': 'apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
export async function handle(request, env = name => Deno.env.get(name), fetcher = fetch) {
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  if (request.headers.get('apikey') !== BROWSER_KEY) return reply({ error: 'Invalid API key' }, 401);
  let input;
  try { input = await request.json(); } catch { return reply({ error: 'Invalid request' }, 400); }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input?.submission_id || '')) return reply({ error: 'Invalid submission ID' }, 400);
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const url = env('SUPABASE_URL');
  if (!key || !url) return reply({ error: 'Database unavailable' }, 503);
  const dbHeaders = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
  const recordUrl = url + '/rest/v1/chanukah_carnival_signups?submission_id=eq.' + input.submission_id;
  try {
    const response = await fetcher(recordUrl + '&select=slot,full_name,email,phone,email_notified_at&order=slot', { headers: dbHeaders });
    if (!response.ok) throw new Error('Read failed');
    const rows = await response.json();
    if (!rows.length) return reply({ error: 'Signup not found' }, 404);
    if (rows.every(row => row.email_notified_at)) return reply({ emailed: true });
    // Only saved database values are passed to the fixed-recipient email relay.
    const row = rows[0];
    const sent = await fetcher('https://ynfjfanvdvpyycoeweca.supabase.co/functions/v1/chanukah-carnival-email-relay', {
      method: 'POST', headers: { apikey: 'sb_publishable_j7q6Ox0GVsUv68D3oQiOBA_2Avx50il', 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: input.submission_id, full_name: row.full_name, email: row.email, phone: row.phone, slots: rows.map(row => row.slot) }),
      signal: AbortSignal.timeout(30000)
    });
    if (!sent.ok || !(await sent.json()).id) return reply({ error: 'Email was not confirmed' }, 502);
    const marked = await fetcher(recordUrl, { method: 'PATCH', headers: dbHeaders, body: JSON.stringify({ email_notified_at: new Date().toISOString() }) });
    if (!marked.ok) console.error('Carnival notification sent; receipt update failed');
    return reply({ emailed: true });
  } catch { return reply({ error: 'Email was not confirmed' }, 502); }
}
if (import.meta.main) Deno.serve(request => handle(request));
