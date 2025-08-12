// Stub module for idb (IndexedDB)
// This is used during server-side rendering when IndexedDB is not available

export const openDB = () => {
  throw new Error('IndexedDB is not available in server environment');
};

export const deleteDB = () => {
  throw new Error('IndexedDB is not available in server environment');
};

export const wrap = (value: any) => value;

console.warn('Using stub IndexedDB client - only works in browser environment');