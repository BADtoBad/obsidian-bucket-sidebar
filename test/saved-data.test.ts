import assert from "node:assert/strict";
import test from "node:test";
import { matchesSavedSnapshot } from "../src/saved-data";

test("saved JSON comparison checks values, keys and ordered arrays", () => {
  assert.equal(matchesSavedSnapshot({ a: [1, { b: true }], c: null }, { c: null, a: [1, { b: true }] }), true);
  for (const [expected, actual] of [
    [true, false], [37, "37"], [null, {}], [{}, null], [{}, undefined],
    [{ a: 1 }, { b: 1 }], [{ a: 1 }, { a: 1, b: 2 }],
    [[1, 2], [2, 1]], [[1], [1, 2]], [[1], { 0: 1 }], [{ 0: 1 }, [1]],
    [{ a: [1, { b: true }] }, { a: [1, { b: false }] }]
  ]) {
    assert.equal(matchesSavedSnapshot(expected, actual), false);
  }
});
