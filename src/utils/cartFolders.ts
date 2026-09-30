import { CartFolder, CartItem, Product } from '../types';
import { clampQuantity } from './cartPricing';

// Folder logic for the cart, kept free of React and storage so it can be
// unit tested. `folderId` undefined means "Unassigned items".

export const sameLine = (a: CartItem, b: CartItem) =>
  a.productId === b.productId && a.sellerId === b.sellerId && a.folderId === b.folderId;

export const findFolderByName = (folders: CartFolder[], name: string): CartFolder | undefined => {
  const key = name.trim().toLowerCase();
  return folders.find(folder => folder.name.trim().toLowerCase() === key);
};

export const newFolderId = () => `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// Moves one line to another folder. If the destination already has the same
// product from the same seller, the two lines are combined (capped at the
// per-item limit) so the folder doesn't list it twice.
export const moveItem = (items: CartItem[], itemId: string, folderId: string | undefined): CartItem[] => {
  const item = items.find(i => i.id === itemId);
  if (!item || item.folderId === folderId) return items;
  const moved = { ...item, folderId };
  const existing = items.find(i => i.id !== itemId && sameLine(i, moved));
  if (!existing) return items.map(i => (i.id === itemId ? moved : i));
  return items
    .filter(i => i.id !== itemId)
    .map(i => (i.id === existing.id ? { ...i, quantity: clampQuantity(i.quantity + item.quantity) } : i));
};

// Puts every unassigned line into a folder named after its product's
// category, reusing a folder with that name if there is one. Lines the
// shopper already put in a folder are left alone.
export const organizeByCategory = (
  items: CartItem[],
  folders: CartFolder[],
  products: Product[],
  makeId: () => string = newFolderId,
  now: number = Date.now()
): { items: CartItem[]; folders: CartFolder[]; moved: number } => {
  let nextItems = items;
  const nextFolders = [...folders];
  let moved = 0;
  for (const item of items.filter(i => !i.folderId)) {
    const product = products.find(p => p.id === item.productId);
    if (!product) continue;
    let folder = findFolderByName(nextFolders, product.category);
    if (!folder) {
      folder = { id: makeId(), name: product.category, createdAt: now };
      nextFolders.push(folder);
    }
    nextItems = moveItem(nextItems, item.id, folder.id);
    moved += 1;
  }
  return { items: nextItems, folders: nextFolders, moved };
};

export type SelectionState = 'all' | 'some' | 'none';

export const itemsInFolder = (items: CartItem[], folderId: string | undefined) =>
  items.filter(item => (item.folderId ?? undefined) === folderId);

export const selectionState = (items: CartItem[]): SelectionState => {
  const selected = items.filter(item => item.isSelected).length;
  if (selected === 0) return 'none';
  return selected === items.length ? 'all' : 'some';
};

// Ticks or unticks every line in one folder.
export const setFolderSelection = (items: CartItem[], folderId: string | undefined, selected: boolean): CartItem[] =>
  items.map(item => ((item.folderId ?? undefined) === folderId ? { ...item, isSelected: selected } : item));

// Ticks the lines in one folder and unticks everything else.
export const selectOnlyFolder = (items: CartItem[], folderId: string | undefined): CartItem[] =>
  items.map(item => ({ ...item, isSelected: (item.folderId ?? undefined) === folderId }));

// Names of the folders that have at least one ticked line, in folder order,
// with "Unassigned items" last. Used to say what the order will contain.
export const selectedGroups = (
  items: CartItem[],
  folders: CartFolder[]
): { folderId: string | undefined; name: string; quantity: number }[] => {
  const groups: { folderId: string | undefined; name: string; quantity: number }[] = [];
  const add = (folderId: string | undefined, name: string) => {
    const quantity = itemsInFolder(items, folderId)
      .filter(item => item.isSelected)
      .reduce((sum, item) => sum + item.quantity, 0);
    if (quantity > 0) groups.push({ folderId, name, quantity });
  };
  folders.forEach(folder => add(folder.id, folder.name));
  // Lines whose folder was deleted count as unassigned.
  const known = new Set(folders.map(f => f.id));
  const orphanQuantity = items
    .filter(item => item.isSelected && item.folderId && !known.has(item.folderId))
    .reduce((sum, item) => sum + item.quantity, 0);
  add(undefined, 'Unassigned items');
  if (orphanQuantity > 0) {
    const unassigned = groups.find(g => g.folderId === undefined);
    if (unassigned) unassigned.quantity += orphanQuantity;
    else groups.push({ folderId: undefined, name: 'Unassigned items', quantity: orphanQuantity });
  }
  return groups;
};
