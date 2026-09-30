import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  moveItem,
  organizeByCategory,
  selectedGroups,
  selectionState,
  selectOnlyFolder,
  setFolderSelection
} from '../src/utils/cartFolders';
import { MAX_QUANTITY } from '../src/utils/cartPricing';
import { cartItem, product } from './fixtures';

const products = [
  product({ id: 'A', category: 'Groceries' }),
  product({ id: 'B', category: 'Kitchenware' }),
  product({ id: 'C', category: 'Groceries' })
];

test('moves items into a folder and back out to Unassigned', () => {
  const items = [cartItem({ id: '1', productId: 'A' })];
  const inFolder = moveItem(items, '1', 'f1');
  assert.equal(inFolder[0].folderId, 'f1');
  const out = moveItem(inFolder, '1', undefined);
  assert.equal(out[0].folderId, undefined);
});

test('moving onto the same product in a folder combines the lines up to the limit', () => {
  const items = [
    cartItem({ id: '1', productId: 'A', quantity: 7 }),
    cartItem({ id: '2', productId: 'A', quantity: 6, folderId: 'f1' })
  ];
  const merged = moveItem(items, '1', 'f1');
  assert.equal(merged.length, 1);
  assert.equal(merged[0].quantity, MAX_QUANTITY);
});

test('organize by category files only unassigned items, reusing folders with the same name', () => {
  const items = [
    cartItem({ id: '1', productId: 'A' }),
    cartItem({ id: '2', productId: 'B' }),
    cartItem({ id: '3', productId: 'C', folderId: 'mine' })
  ];
  const folders = [
    { id: 'mine', name: 'Party', createdAt: 0 },
    { id: 'g', name: 'groceries', createdAt: 0 }
  ];
  let n = 0;
  const result = organizeByCategory(items, folders, products, () => `new-${++n}`, 5);
  assert.equal(result.moved, 2);
  assert.equal(result.items.find(i => i.id === '1')?.folderId, 'g', 'reuses the existing Groceries folder');
  assert.equal(result.items.find(i => i.id === '2')?.folderId, 'new-1');
  assert.equal(result.items.find(i => i.id === '3')?.folderId, 'mine', 'hand-placed items stay put');
  assert.deepEqual(result.folders.map(f => f.name), ['Party', 'groceries', 'Kitchenware']);
});

test('folder checkboxes select a whole folder, and "buy only this folder" clears the rest', () => {
  const items = [
    cartItem({ id: '1', folderId: 'f1', isSelected: false }),
    cartItem({ id: '2', folderId: 'f1', isSelected: true }),
    cartItem({ id: '3', isSelected: true })
  ];
  assert.equal(selectionState(items.filter(i => i.folderId === 'f1')), 'some');
  const all = setFolderSelection(items, 'f1', true);
  assert.deepEqual(all.map(i => i.isSelected), [true, true, true]);
  const only = selectOnlyFolder(all, 'f1');
  assert.deepEqual(only.map(i => i.isSelected), [true, true, false]);
  const unassignedOnly = selectOnlyFolder(all, undefined);
  assert.deepEqual(unassignedOnly.map(i => i.isSelected), [false, false, true]);
});

test('selectedGroups says which folders the order will contain', () => {
  const folders = [
    { id: 'f1', name: 'Kitchen', createdAt: 0 },
    { id: 'f2', name: 'Pantry', createdAt: 0 }
  ];
  const items = [
    cartItem({ id: '1', folderId: 'f1', quantity: 2 }),
    cartItem({ id: '2', folderId: 'f2', isSelected: false }),
    cartItem({ id: '3', quantity: 1 })
  ];
  assert.deepEqual(selectedGroups(items, folders), [
    { folderId: 'f1', name: 'Kitchen', quantity: 2 },
    { folderId: undefined, name: 'Unassigned items', quantity: 1 }
  ]);
});
