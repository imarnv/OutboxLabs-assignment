import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normaliseRecipients } from './recipients';

describe('normaliseRecipients', () => {
  it('lower-cases, trims, de-duplicates and flags invalid addresses', () => {
    const r = normaliseRecipients([' A@x.com', 'a@x.com', 'b@y.io', 'nope', '']);
    assert.deepEqual(r.valid, ['a@x.com', 'b@y.io']);
    assert.equal(r.duplicates, 1);
    assert.deepEqual(r.invalid, ['nope']);
  });
});
