class LocalDataStorageService {
  private storage: typeof chrome.storage.local;

  constructor(storage: typeof chrome.storage.local) {
    this.storage = storage;
  }

  async getUserId(): Promise<string | null> {
    const result = await this.storage.get(['userId']);
    return result.userId || null;
  }

  async setUserId(userId: string): Promise<void> {
    await this.storage.set({ userId });
  }
}

export default LocalDataStorageService;
