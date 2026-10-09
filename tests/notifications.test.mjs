import test from 'node:test';
import assert from 'node:assert/strict';
import { handle as relay } from '../supabase/functions/chanukah-carnival-email-relay/index.ts';
import { handle as notify } from '../supabase/functions/chanukah-carnival-notify/index.ts';
const id = '00000000-0000-4000-8000-000000000001';
const request = (key, body) => new Request('https://example.com', { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
test('relay sends only the organizer and uses a stable idempotency key', async () => {
  const response = await relay(request('sb_publishable_j7q6Ox0GVsUv68D3oQiOBA_2Avx50il', { submission_id: id, full_name: 'Volunteer', email: 'volunteer@example.com', phone: '5551234567', slots: [1, 3], to: 'someone@example.com' }), key => ({ RESEND_API_KEY: 'test', REMINDER_EMAIL_FROM: 'Sender <sender@example.com>' })[key], async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    const email = JSON.parse(options.body);
    assert.deepEqual(email.to, ['esemmoc@gmail.com']);
    assert.equal(email.reply_to, 'volunteer@example.com');
    assert.match(email.text, /Selected options: 1, 3/);
    assert.equal(options.headers['Idempotency-Key'], 'chanukah-carnival/' + id);
    return Response.json({ id: 'receipt' });
  });
  assert.deepEqual(await response.json(), { id: 'receipt' });
});
test('notification reads saved answers, sends once, and records acceptance', async () => {
  let calls = 0;
  const response = await notify(request('sb_publishable_JOUqLZDnfGu_yCa6k6FVDQ_AYwpr72i', { submission_id: id, email: 'ignored@example.com' }), key => ({ SUPABASE_SERVICE_ROLE_KEY: 'test', SUPABASE_URL: 'https://database.example.com' })[key], async (url, options) => {
    calls++;
    if (calls === 1) return Response.json([{ slot: 1, full_name: 'Saved name', email: 'saved@example.com', phone: '5551234567', email_notified_at: null }]);
    if (calls === 2) {
      const body = JSON.parse(options.body);
      assert.equal(body.email, 'saved@example.com');
      assert.equal(body.full_name, 'Saved name');
      return Response.json({ id: 'receipt' });
    }
    assert.equal(options.method, 'PATCH');
    assert.ok(JSON.parse(options.body).email_notified_at);
    return new Response(null, { status: 204 });
  });
  assert.equal(calls, 3);
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
