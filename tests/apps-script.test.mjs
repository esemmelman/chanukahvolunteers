import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { handle } from '../supabase/functions/chanukah-carnival-notify/index.ts';
const id = '00000000-0000-4000-8000-000000000001';
const source = fs.readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8').replace("const CHANUKAH_TOKEN = '__PRIVATE_TOKEN__';", "const CHANUKAH_TOKEN = 'test-token';");
test('Apps Script authenticates, sends to each recipient, and skips recorded sends on retry', () => {
  const sent = [], ledger = new Map();
  let failParticipant = true;
  const context = vm.createContext({ console,
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => text }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => ledger.get(key), setProperty: (key, value) => ledger.set(key, value) }) },
    MailApp: { getRemainingDailyQuota: () => 100, sendEmail: email => { if (failParticipant && email.to === 'kerigee1@aol.com') throw new Error('test'); sent.push(email); } }
  });
  vm.runInContext(source, context);
  const send = (role, token = 'test-token') => JSON.parse(context.doPost({ postData: { contents: JSON.stringify({ token, id, role, email: 'kerigee1@aol.com', text: 'Thank you' }) } }));
  assert.equal(send('organizer', 'wrong').error, 'unauthorized');
  assert.equal(sent.length, 0);
  assert.equal(send('organizer').ok, true);
  assert.equal(send('participant').ok, false);
  failParticipant = false;
  assert.equal(send('organizer').ok, true);
  assert.equal(send('participant').id, 'chanukah-' + id + '-participant');
  assert.equal(sent.length, 2);
  assert.equal(sent[0].to, 'esemmoc@gmail.com');
  assert.equal(sent[1].to, 'kerigee1@aol.com');
  assert.match(sent[1].subject, /Your Chanukah Carnival/);
});
test('notification attempts both recipients independently using saved answers', async () => {
  const roles = [];
  let marked = false;
  const response = await handle(new Request('https://example.com', { method: 'POST', headers: { apikey: 'sb_publishable_JOUqLZDnfGu_yCa6k6FVDQ_AYwpr72i' }, body: JSON.stringify({ submission_id: id, email: 'ignored@example.com' }) }),
    name => ({ SUPABASE_URL: 'https://db.example.com', SUPABASE_SERVICE_ROLE_KEY: 'test' })[name],
    async (url, options) => {
      if (url.includes('email_settings')) return Response.json([{ script_url: 'https://script.google.com/macros/s/test/exec', token: 'test-token' }]);
      if (url.startsWith('https://script.google.com')) {
        const body = JSON.parse(options.body);
        roles.push(body.role);
        assert.equal(body.email, 'saved@example.com');
        assert.equal(body.id, id);
        return Response.json(body.role === 'organizer' ? { ok: false } : { ok: true, id: 'chanukah-' + id + '-participant' });
      }
      if (options.method === 'PATCH') { marked = true; return new Response(null, { status: 204 }); }
      return Response.json([{ slot: 44, full_name: 'Saved name', email: 'saved@example.com', phone: '5551234567' }]);
    });
  assert.deepEqual(roles, ['organizer', 'participant']);
  assert.equal(response.status, 502);
  assert.equal(marked, false);
});
