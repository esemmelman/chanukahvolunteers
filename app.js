'use strict';
const API_URL = 'https://fgomaujsdblpzxhnnqrg.supabase.co/rest/v1/chanukah_carnival_signups';
const NOTIFY_URL = 'https://fgomaujsdblpzxhnnqrg.supabase.co/functions/v1/chanukah-carnival-notify';
// Public browser key. Contact details are protected by database column grants.
const API_KEY = 'sb_publishable_JOUqLZDnfGu_yCa6k6FVDQ_AYwpr72i';
const form = document.getElementById('signup');
const nameInput = document.getElementById('full-name');
const phoneInput = document.getElementById('phone');
const boxes = [...form.querySelectorAll('[name="slot"]')];
const status = document.getElementById('status');
const loadStatus = document.getElementById('load-status');
const submitButton = form.querySelector('[type="submit"]');
let saved = [];
let busy = false;
let loaded = false;
let refreshing = false;
let submissionId = crypto.randomUUID();
function render() {
  boxes.forEach(box => {
    const row = saved.find(row => row.slot === Number(box.value));
    box.disabled = busy || !loaded || Boolean(row);
    if (row) box.checked = false;
    box.closest('label').classList.toggle('filled', Boolean(row));
    const line = document.querySelector(`[data-slot="${box.value}"]`);
    line.textContent = row ? row.full_name : box.checked ? nameInput.value.trim() : '';
    line.classList.toggle('pending', !row && box.checked);
  });
  submitButton.disabled = busy || !loaded || boxes.every(box => saved.some(row => row.slot === Number(box.value)));
  validate();
}
function validate() {
  nameInput.setCustomValidity(nameInput.value.trim() ? '' : 'Please enter your name.');
  const digits = phoneInput.value.replace(/\D/g, '').length;
  phoneInput.setCustomValidity(digits >= 10 && digits <= 15 ? '' : 'Please enter your cell number including area code.');
  boxes.forEach(box => box.setCustomValidity(''));
  const available = boxes.find(box => !box.disabled);
  if (available) available.setCustomValidity(boxes.some(box => box.checked && !box.disabled) ? '' : 'Please select one or more options.');
}
async function refresh() {
  if (refreshing || busy) return;
  refreshing = true;
  try {
    const response = await fetch(API_URL + '?select=slot,full_name&order=slot', { headers: { apikey: API_KEY }, cache: 'no-store' });
    if (!response.ok) throw new Error('Load failed');
    saved = await response.json();
    loaded = true;
    loadStatus.textContent = boxes.every(box => saved.some(row => row.slot === Number(box.value))) ? 'All volunteer slots are filled. Thank you!' : '';
  } catch {
    loadStatus.textContent = 'Unable to refresh saved names. Retrying shortly.';
  } finally { refreshing = false; render(); }
}
form.addEventListener('input', render);
form.addEventListener('change', render);
form.addEventListener('reset', event => {
  if (busy) { event.preventDefault(); return; }
  submissionId = crypto.randomUUID();
  status.textContent = '';
  setTimeout(render, 0);
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  validate();
  if (busy || !loaded || !form.reportValidity()) return;
  const data = new FormData(form);
  const rows = data.getAll('slot').map(slot => ({ slot: Number(slot), submission_id: submissionId, full_name: data.get('full_name').trim(), email: data.get('email').trim(), phone: data.get('phone').trim() }));
  if (!rows.length) return;
  busy = true;
  [...form.elements].forEach(control => { control.disabled = true; });
  status.textContent = 'Saving your signup…';
  let success = false;
  let emailed = false;
  try {
    const response = await fetch(API_URL, { method: 'POST', headers: { apikey: API_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(rows) });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.code === '23505' ? 'A selected slot is already saved. Check the refreshed names before signing up again.' : 'We could not save your signup. Please try again.');
    }
    success = true;
    status.textContent = 'Signup saved. Sending notification…';
    try {
      const notification = await fetch(NOTIFY_URL, { method: 'POST', headers: { apikey: API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ submission_id: submissionId }) });
      emailed = notification.ok && (await notification.json()).emailed === true;
    } catch { /* Saving remains successful if email sending fails. */ }
  } catch (error) {
    status.textContent = error.message === 'Failed to fetch' ? 'The connection was interrupted. Check the refreshed names before trying again.' : error.message;
  } finally {
    busy = false;
    [...form.elements].forEach(control => { control.disabled = false; });
  }
  if (success) {
    form.reset();
    status.textContent = emailed ? 'Thank you! Your signup has been saved and a confirmation email sent to ' + data.get('email').trim() + '.' : 'Your signup has been saved, but the confirmation emails could not be confirmed. Please let the organizer know; you do not need to sign up again.';
  }
  await refresh();
});
render();
refresh();
setInterval(() => { if (!document.hidden) refresh(); }, 15000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
