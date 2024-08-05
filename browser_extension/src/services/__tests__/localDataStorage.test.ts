import { chrome } from 'jest-chrome';
import LocalDataStorageService from '../localDataStorage';

describe('LocalDataStorageService', () => {
  let localDataStorage: LocalDataStorageService;
  let mockStorage: jest.Mocked<{
    get: jest.Mock<Promise<{ [key: string]: any }>, [string[]]>;
    set: jest.Mock;
  }>;

  beforeEach(() => {
    mockStorage = {
      get: jest.fn(),
      set: jest.fn(),
    };
    localDataStorage = new LocalDataStorageService(mockStorage as any);
  });

  describe('getUserId', () => {
    it('should return userId when it exists', async () => {
      mockStorage.get.mockResolvedValue({ userId: 'test-user-id' });
      const result = await localDataStorage.getUserId();
      expect(result).toBe('test-user-id');
      expect(mockStorage.get).toHaveBeenCalledWith(['userId']);
    });

    it('should return null when userId does not exist', async () => {
      mockStorage.get.mockResolvedValue({});
      const result = await localDataStorage.getUserId();
      expect(result).toBeNull();
      expect(mockStorage.get).toHaveBeenCalledWith(['userId']);
    });
  });

  describe('setUserId', () => {
    it('should set userId in storage', async () => {
      await localDataStorage.setUserId('new-user-id');
      expect(mockStorage.set).toHaveBeenCalledWith({ userId: 'new-user-id' });
    });
  });
});
