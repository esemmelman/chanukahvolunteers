import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('Open filter hides filled rows and full sections, and follows refreshed names', async () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const sections = [...html.matchAll(/<fieldset><legend>(.*?)<\/legend>([\s\S]*?)<\/fieldset>/g)].map(match => {
    const rows = [...match[2].matchAll(/name="slot" value="(\d+)"/g)].map(slot => {
      const row = { hidden: false, classList: { toggle() {} } };
      const line = { textContent: '', classList: { toggle() {} } };
      const box = { value: slot[1], checked: false, setCustomValidity() {}, closest: () => row };
      return { row, line, box };
    });
    return { title: match[1], rows, querySelectorAll: () => rows.map(x => x.row) };
  });
  const boxes = sections.flatMap(s => s.rows.map(x => x.box));
  assert.equal(boxes.length, 46);
  assert.equal(new Set(boxes.map(x => x.value)).size, 46);
  for (const title of ['Food Service  12:15', 'Food Clean Up']) assert.equal(sections.find(s => s.title.startsWith(title)).rows.length, 4);
  const open = { checked: false, addEventListener() {} };
  const field = { value: '', setCustomValidity() {} };
  const form = { querySelectorAll: selector => selector === 'fieldset' ? sections : boxes, querySelector: () => ({}), addEventListener() {} };
  let saved = sections[0].rows.map(x => ({ slot: Number(x.box.value), full_name: 'Saved volunteer' }));
  const context = vm.createContext({
    document: { getElementById: id => id === 'signup' ? form : id === 'open-only' ? open : field, addEventListener() {}, querySelector: selector => sections.flatMap(s => s.rows).find(x => selector.includes('"' + x.box.value + '"')).line },
    crypto: { randomUUID: () => 'test' }, setInterval() {}, clearTimeout() {}, console,
    fetch: async () => ({ ok: true, json: async () => saved })
  });
  vm.runInContext(fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8'), context);
  await vm.runInContext('refresh()', context);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sections[0].hidden, false);
  open.checked = true;
  vm.runInContext('render()', context);
  assert.equal(sections[0].hidden, true);
  assert.ok(sections[0].rows.every(x => x.row.hidden));
  assert.equal(sections[1].hidden, false);
  assert.ok(sections[1].rows.every(x => !x.row.hidden));
  saved = [{ slot: 6, full_name: 'New volunteer' }];
  await vm.runInContext('refresh()', context);
  assert.equal(sections[0].hidden, false);
  assert.equal(sections[1].rows[0].row.hidden, true);
  assert.equal(sections[1].hidden, false);
  open.checked = false;
  vm.runInContext('render()', context);
  assert.ok(sections.every(s => !s.hidden && s.rows.every(x => !x.row.hidden)));
});
