import test from 'node:test';
import assert from 'node:assert/strict';
import { handle as relay, selectedOptions, participantText } from '../supabase/functions/chanukah-carnival-email-relay/index.ts';
import { handle as notify } from '../supabase/functions/chanukah-carnival-notify/index.ts';
const id = '00000000-0000-4000-8000-000000000001';
test('participant email uses singular for one slot and omits option-number lines', () => {
  const text = participantText({ full_name: 'Volunteer', slots: [44] });
  assert.match(text, /Here is your selection\./);
  assert.match(text, /Prize Table  12:15 PM - 1:30 PM/);
  assert.doesNotMatch(text, /Selected options:|Here are your selections/);
  const multiple = participantText({ full_name: 'Volunteer', slots: [38, 44] });
  assert.match(multiple, /Here are your selections:/);
  assert.doesNotMatch(multiple, /Selected options:/);
});
test('new prize and ticket shifts use their own signup lines', () => {
  assert.equal(selectedOptions([44, 45]), 'Prize Table  12:15 PM - 1:30 PM\nSelected options: 1\n\nTickets Table  11:00 AM - 12:15 PM\nSelected options: 1');
  assert.equal(selectedOptions([45, 46]), 'Tickets Table  11:00 AM - 12:15 PM\nSelected options: 1, 2');
  assert.match(participantText({ full_name: 'Volunteer', slots: [46] }), /Tickets Table  11:00 AM - 12:15 PM/);
});
test('booth, table, and breakdown slots are grouped with local numbering', () => {
  assert.equal(selectedOptions([22, 29, 30, 37, 38, 39, 40, 43]), 'Game Booths  11:00 AM - 12:15 PM\nSelected options: 1, 8\n\nGame Booths  12:15 PM - 1:30 PM\nSelected options: 1, 8\n\nPrize Table  11:00 AM - 12:15 PM\nSelected options: 1\n\nTickets Table  12:15 PM - 1:30 PM\nSelected options: 1\n\nBreak Down Booths  1:30 PM - 2:30 PM\nSelected options: 1, 4');
});
test('new food slots map to the correct heading and local row number', () => {
  assert.equal(selectedOptions([6, 10, 11, 15, 16, 18, 19, 21]), 'Food Prep  9:00 AM - 11:00 AM\nSelected options: 1, 5\n\nFood Service  11:00 AM - 12:15 PM\nSelected options: 1, 5\n\nFood Service  12:15 PM - 1:30 PM\nSelected options: 1, 3\n\nFood Clean Up  1:30 PM - 2:30 PM\nSelected options: 1, 3');
});
const request = (key, body) => new Request('https://example.com', { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
test('relay sends separate organizer and participant emails with stable keys', async () => {
  let calls = 0;
  const response = await relay(request('sb_publishable_j7q6Ox0GVsUv68D3oQiOBA_2Avx50il', { submission_id: id, full_name: 'Volunteer', email: 'volunteer@example.com', phone: '5551234567', slots: [1, 3], to: 'someone@example.com' }), key => ({ RESEND_API_KEY: 'test', REMINDER_EMAIL_FROM: 'Sender <sender@example.com>' })[key], async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    const email = JSON.parse(options.body);
    calls++;
    assert.deepEqual(email.to, [calls === 1 ? 'esemmoc@gmail.com' : 'volunteer@example.com']);
    assert.equal(email.reply_to, calls === 1 ? 'volunteer@example.com' : 'esemmoc@gmail.com');
    if (calls === 1) assert.match(email.text, /Selected options: 1, 3/);
    else assert.doesNotMatch(email.text, /Selected options:/);
    assert.equal(options.headers['Idempotency-Key'], 'chanukah-carnival/' + id + (calls === 1 ? '' : '/participant'));
    if (calls === 2) {
      assert.match(email.text, /Thank you for volunteering/);
      assert.match(email.text, /Set Up Game Booths  8:00 AM - 10:00 AM/);
    }
    return Response.json({ id: 'receipt' });
  });
  assert.equal(calls, 2);
  assert.deepEqual(await response.json(), { id: 'receipt', participant_id: 'receipt' });
});
test('notification reads saved answers, sends once, and records acceptance', async () => {
  let calls = 0;
  const response = await notify(request('sb_publishable_JOUqLZDnfGu_yCa6k6FVDQ_AYwpr72i', { submission_id: id, email: 'ignored@example.com' }), key => ({ SUPABASE_SERVICE_ROLE_KEY: 'test', SUPABASE_URL: 'https://database.example.com' })[key], async (url, options) => {
    calls++;
    if (calls === 1) return Response.json([{ slot: 1, full_name: 'Saved name', email: 'saved@example.com', phone: '5551234567', email_notified_at: null }]);
    if (calls === 2) return Response.json([{ script_url: '', token: 'test' }]);
    if (calls === 3) {
      const body = JSON.parse(options.body);
      assert.equal(body.email, 'saved@example.com');
      assert.equal(body.full_name, 'Saved name');
      return Response.json({ id: 'receipt', participant_id: 'receipt' });
    }
    assert.equal(options.method, 'PATCH');
    assert.ok(JSON.parse(options.body).email_notified_at);
    return new Response(null, { status: 204 });
  });
  assert.equal(calls, 4);
  assert.deepEqual(await response.json(), { emailed: true });
});
test('already notified signup skips sending', async () => {
  let calls = 0;
  const response = await notify(request('sb_publishable_JOUqLZDnfGu_yCa6k6FVDQ_AYwpr72i', { submission_id: id }), key => ({ SUPABASE_SERVICE_ROLE_KEY: 'test', SUPABASE_URL: 'https://database.example.com' })[key], async () => {
    calls++;
    return Response.json([{ email_notified_at: '2026-10-09T00:00:00Z' }]);
  });
  assert.equal(calls, 1);
  assert.deepEqual(await response.json(), { emailed: true });
});
