import React, { useId, useState } from 'react';
import { useStore } from '../context/store';

interface MoveToMenuProps {
  itemId: string;
  currentFolderId?: string;
  productName: string;
}

const NEW_FOLDER = '__new__';
const UNASSIGNED = '';

// A plain, always-visible "Folder" dropdown on every cart item. It moves the
// item into any folder, back out to Unassigned items, or into a new folder
// named on the spot. (It replaces a hidden "Move to…" pop-up menu.)
const MoveToMenu: React.FC<MoveToMenuProps> = ({ itemId, currentFolderId, productName }) => {
  const { cartFolders, moveItemToFolder, moveItemToNewFolder } = useStore();
  const id = useId();
  const [naming, setNaming] = useState(false);
  const [newName, setNewName] = useState('');

  const handleChange = (value: string) => {
    if (value === NEW_FOLDER) {
      setNaming(true);
      return;
    }
    setNaming(false);
    moveItemToFolder(itemId, value === UNASSIGNED ? undefined : value);
  };

  const createAndMove = () => {
    if (!newName.trim()) return;
    moveItemToNewFolder(itemId, newName);
    setNewName('');
    setNaming(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={`${id}-folder`} className="text-sm text-gray-700">
        Folder
      </label>
      <select
        id={`${id}-folder`}
        value={naming ? NEW_FOLDER : currentFolderId ?? UNASSIGNED}
        onChange={e => handleChange(e.target.value)}
        className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-gray-900 max-w-[12rem]"
        aria-label={`Folder for ${productName}`}
      >
        <option value={UNASSIGNED}>Unassigned items</option>
        {cartFolders.map(folder => (
          <option key={folder.id} value={folder.id}>
            {folder.name}
          </option>
        ))}
        <option value={NEW_FOLDER}>+ New folder…</option>
      </select>
      {naming && (
        <span className="flex items-center gap-1">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') createAndMove();
              if (e.key === 'Escape') setNaming(false);
            }}
            placeholder="New folder name"
            aria-label={`Name the new folder for ${productName}`}
            maxLength={40}
            autoFocus
            className="w-36 px-2 py-1 text-sm border border-gray-300 rounded"
          />
          <button
            type="button"
            onClick={createAndMove}
            disabled={!newName.trim()}
            className="text-sm font-semibold px-2 py-1 rounded bg-amazin-orange text-gray-900 disabled:bg-gray-300 disabled:text-gray-600"
          >
            Move
          </button>
          <button type="button" onClick={() => setNaming(false)} className="text-sm text-gray-700 hover:underline px-1">
            Cancel
          </button>
        </span>
      )}
    </div>
  );
};

export default MoveToMenu;
