export const sections = [
  { title: 'Set Up Game Booths  8:00 AM - 10:00 AM', start: 1, count: 5 },
  { title: 'Food Prep  9:00 AM - 11:00 AM', start: 6, count: 5 },
  { title: 'Food Service  11:00 AM - 12:15 PM', start: 11, count: 5 },
  { title: 'Food Service  12:15 PM - 1:30 PM', start: 16, count: 3 },
  { title: 'Food Clean Up  1:30 PM - 2:30 PM', start: 19, count: 3 },
  { title: 'Game Booths  11:00 AM - 12:15 PM', start: 22, count: 8 },
  { title: 'Game Booths  12:15 PM - 1:30 PM', start: 30, count: 8 },
  { title: 'Prize Table  11:00 AM - 12:15 PM', start: 38, count: 1 },
  { title: 'Prize Table  12:15 PM - 1:30 PM', start: 44, count: 1 },
  { title: 'Tickets Table  11:00 AM - 12:15 PM', start: 45, count: 1 },
  { title: 'Tickets Table  12:15 PM - 1:30 PM', start: 39, count: 1 },
  { title: 'Break Down Booths  1:30 PM - 2:30 PM', start: 40, count: 4 }
];
export function selectedOptions(slots) {
  return sections.map(section => {
    const selected = slots.filter(slot => slot >= section.start && slot < section.start + section.count).map(slot => slot - section.start + 1);
    return selected.length ? `${section.title}\nSelected options: ${selected.join(', ')}` : '';
  }).filter(Boolean).join('\n\n');
}
export async function handle(request, env = name => Deno.env.get(name), fetcher = fetch) {
  const reply = (body, status = 200) => Response.json(body, { status });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  if (request.headers.get('apikey') !== 'sb_publishable_j7q6Ox0GVsUv68D3oQiOBA_2Avx50il') return reply({ error: 'Invalid API key' }, 401);
  let row;
  try { row = await request.json(); } catch { return reply({ error: 'Invalid request' }, 400); }
  if (!/^[0-9a-f-]{36}$/i.test(row?.submission_id || '') || typeof row.full_name !== 'string' || row.full_name.length > 120 || typeof row.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) || row.email.length > 254 || typeof row.phone !== 'string' || row.phone.length > 40 || !Array.isArray(row.slots) || !row.slots.length || row.slots.length > 45 || row.slots.some(slot => !Number.isInteger(slot) || slot < 1 || slot > 45)) return reply({ error: 'Invalid notification' }, 400);
  const key = env('RESEND_API_KEY');
  const configuredFrom = env('REMINDER_EMAIL_FROM');
  if (!key || !configuredFrom) return reply({ error: 'Email unavailable' }, 503);
  const sender = (configuredFrom.match(/<([^<>]+)>/)?.[1] || configuredFrom).trim();
  const text = `Chanukah Carnival - November 8th\n\nName: ${row.full_name}\nEmail: ${row.email}\nCell: ${row.phone}\n\n${selectedOptions(row.slots)}`;
  try {
    const receipts = {};
    for (const [role, recipient] of [['organizer', 'esemmoc@gmail.com'], ['participant', row.email]]) {
      const participant = role === 'participant';
      const emailText = participant ? `Chanukah Carnival - November 8th\n\nHello ${row.full_name},\n\nThank you for volunteering! Your signup has been saved. Here are your selections:\n\n${selectedOptions(row.slots)}\n\nWe look forward to seeing you!` : text;
      const response = await fetcher('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', 'Idempotency-Key': 'chanukah-carnival/' + row.submission_id + (participant ? '/participant' : '') }, body: JSON.stringify({ from: 'Chanukah Carnival <' + sender + '>', to: [recipient], subject: participant ? 'Your Chanukah Carnival signup - November 8th' : 'Chanukah Carnival - November 8th signup', text: emailText, reply_to: participant ? 'esemmoc@gmail.com' : row.email }), signal: AbortSignal.timeout(12000) });
      if (!response.ok) return reply({ error: role + ' email rejected' }, 502);
      const sent = await response.json();
      if (!sent.id) return reply({ error: role + ' email not confirmed' }, 502);
      receipts[role] = sent.id;
    }
    return reply({ id: receipts.organizer, participant_id: receipts.participant });
  } catch { return reply({ error: 'Email unavailable' }, 502); }
}
if (import.meta.main) Deno.serve(request => handle(request));
