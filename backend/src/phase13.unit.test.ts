import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveUtcRange, createdAtFilter } from './analytics/dateRange.js';
import { extractUnknownVariables, renderTemplate } from './notifications/template.js';
import { AppError } from './middleware/errorHandler.js';

test('UTC date ranges cover today and custom bounds', () => {
  const today = resolveUtcRange('today');
  assert.ok(today.start && today.end);
  assert.equal(today.start.getUTCHours(), 0);
  assert.ok(today.end!.getTime() >= today.start.getTime());
  const custom = resolveUtcRange('custom', '2026-01-01T00:00:00.000Z', '2026-01-31T23:59:59.000Z');
  assert.equal(custom.start?.toISOString().startsWith('2026-01-01'), true);
  const filter = createdAtFilter(custom);
  assert.ok((filter.createdAt as { $gte: Date }).$gte);
  assert.throws(() => resolveUtcRange('not-a-range'), AppError);
});

test('templates only replace allow-listed variables', () => {
  const text = renderTemplate('Hello {{recipientName}} {{evil}} {{instituteName}}', {
    recipientName: 'College A',
    instituteName: 'Test Institute',
    evil: 'nope'
  });
  assert.equal(text.includes('College A'), true);
  assert.equal(text.includes('Test Institute'), true);
  assert.equal(text.includes('nope'), false);
  assert.deepEqual(extractUnknownVariables('{{notAllowed}} {{status}}'), ['notAllowed']);
});
