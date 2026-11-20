import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = fileURLToPath(new URL('../workflows/n8n/', import.meta.url));
const expected = [
  '01-master-controller.json',
  '02-reddit-collector.json',
  '03-recursive-web-crawler.json',
  '04-youtube-collector.json',
];
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
let totalNodes = 0;
let totalCodeNodes = 0;

function* strings(value) {
  if (typeof value === 'string') yield value;
  else if (value && typeof value === 'object') {
    for (const child of Object.values(value)) yield* strings(child);
  }
}

assert.deepEqual(readdirSync(directory).filter(name => name.endsWith('.json')).sort(), expected);

for (const filename of expected) {
  const workflow = JSON.parse(readFileSync(path.join(directory, filename), 'utf8'));
  assert.equal(typeof workflow.name, 'string', `${filename}: missing workflow name`);
  assert.ok(Array.isArray(workflow.nodes) && workflow.nodes.length, `${filename}: no nodes`);
  assert.equal(workflow.active, false, `${filename}: distribution exports must be inactive`);
  assert.deepEqual(workflow.pinData, {}, `${filename}: remove pinned execution data`);

  const names = new Set(workflow.nodes.map(node => node.name));
  const ids = new Set(workflow.nodes.map(node => node.id));
  assert.equal(names.size, workflow.nodes.length, `${filename}: duplicate node names`);
  assert.equal(ids.size, workflow.nodes.length, `${filename}: duplicate node IDs`);

  for (const [source, outputs] of Object.entries(workflow.connections)) {
    assert.ok(names.has(source), `${filename}: missing connection source ${source}`);
    for (const branches of Object.values(outputs)) {
      for (const branch of branches) {
        for (const target of branch ?? []) {
          assert.ok(names.has(target.node), `${filename}: missing connection target ${target.node}`);
        }
      }
    }
  }

  for (const node of workflow.nodes) {
    assert.ok(node.id && node.name && node.type, `${filename}: incomplete node identity`);
    assert.ok(!node.credentials, `${filename}: reconnect credentials after import (${node.name})`);
    for (const parameter of strings(node.parameters)) {
      for (const match of parameter.matchAll(/(?:\$\(|\$items\()\s*['"]([^'"]+)['"]/g)) {
        assert.ok(names.has(match[1]), `${filename}: missing node reference ${match[1]}`);
      }
    }
    if (node.type === 'n8n-nodes-base.code') {
      assert.equal(typeof node.parameters.jsCode, 'string');
      new AsyncFunction('$input', '$', '$json', '$items', node.parameters.jsCode);
      totalCodeNodes++;
    }
  }

  totalNodes += workflow.nodes.length;
  console.log(`OK ${filename}: ${workflow.nodes.length} nodes`);
}

console.log(`Validated ${expected.length} workflows, ${totalNodes} nodes, ${totalCodeNodes} Code node bodies.`);
console.log('Static validation only; credentials, n8n execution and external API responses are not tested.');
