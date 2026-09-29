import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../context/store';

interface MoveToMenuProps {
  itemId: string;
  currentFolderId?: string;
  productName: string;
}

// A clearly labeled "Move to..." action on every cart item. It replaces the
// small "No folder" dropdown, and lets the shopper create a folder on the spot.
const MoveToMenu: React.FC<MoveToMenuProps> = ({ itemId, currentFolderId, productName }) => {
  const { cartFolders, moveItemToFolder, moveItemToNewFolder } = useStore();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const moveTo = (folderId: string | undefined) => {
    moveItemToFolder(itemId, folderId);
    setOpen(false);
  };

  const createAndMove = () => {
    if (!newName.trim()) return;
    moveItemToNewFolder(itemId, newName);
    setNewName('');
    setOpen(false);
  };

  const options: { id: string | undefined; label: string }[] = [
    { id: undefined, label: 'Unassigned items' },
    ...cartFolders.map(folder => ({ id: folder.id, label: folder.name }))
  ];

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-sm px-3 py-1 rounded border border-gray-300 text-gray-800 hover:bg-gray-100"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Move ${productName} to a folder`}
      >
        📁 Move to…
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-30 mt-1 w-60 bg-white border border-gray-200 rounded-md shadow-lg py-1 left-0"
        >
          {options.map(option => {
            const isCurrent = option.id === currentFolderId;
            return (
              <button
                key={option.id ?? 'unassigned'}
                type="button"
                role="menuitem"
                disabled={isCurrent}
                onClick={() => moveTo(option.id)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 disabled:text-gray-400 disabled:cursor-default disabled:hover:bg-white"
              >
                {option.label}
                {isCurrent && ' (here now)'}
              </button>
            );
          })}
          <div className="border-t mt-1 pt-2 px-3 pb-2">
            <label className="block text-xs text-gray-500 mb-1" htmlFor={`new-folder-${itemId}`}>
              New folder
            </label>
            <div className="flex gap-1">
              <input
                id={`new-folder-${itemId}`}
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') createAndMove();
                }}
                placeholder="e.g. Dorm"
                className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-300 rounded"
              />
              <button
                type="button"
                onClick={createAndMove}
                disabled={!newName.trim()}
                className="text-sm px-2 py-1 rounded bg-amazin-orange text-white disabled:bg-gray-300"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoveToMenu;
