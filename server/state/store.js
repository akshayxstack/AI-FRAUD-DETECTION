export const store = {
  // uploaded: boolean flag indicating if any file has been processed
  uploaded: false,
  // transactions: array storing parsed transaction records
  transactions: [],
  analysis: null,
};

export function resetStore() {
  store.uploaded = false;
  store.transactions = [];
  store.analysis = null;
}
