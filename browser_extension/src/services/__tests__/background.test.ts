import { chrome } from 'jest-chrome';
import BackgroundService from '../background';
import DataSyncService from '../dataSync';
import LocalDataStorageService from '../localDataStorage';
import BrowserMessageService, {
  BrowserEvent,
  BrowserMessageServiceFactory,
} from '../browserMessage';

jest.mock('../dataSync');
jest.mock('../localDataStorage');
jest.mock('../browserMessage');

describe('BackgroundService', () => {
  let backgroundService: BackgroundService;
  let mockDataSyncService: jest.Mocked<DataSyncService>;
  let mockLocalDataStorageService: jest.Mocked<LocalDataStorageService>;
  let mockBrowserMessageService: jest.Mocked<BrowserMessageService>;

  beforeEach(() => {
    // create mock depedencies
    mockDataSyncService = new DataSyncService({
      API_ENDPOINT: 'https://api.example.com',
    }) as jest.Mocked<DataSyncService>;
    mockLocalDataStorageService = new LocalDataStorageService({
      get: jest.fn(),
      set: jest.fn(),
    } as any) as jest.Mocked<LocalDataStorageService>;
    mockBrowserMessageService =
      BrowserMessageServiceFactory.createBrowserMessageService(
        'chrome'
      ) as jest.Mocked<BrowserMessageService>;

    backgroundService = new BackgroundService(
      mockDataSyncService,
      mockLocalDataStorageService,
      mockBrowserMessageService
    );
  });

  describe('initialization', () => {
    it('should initialize userId from local storage if it exists', async () => {
      const mockUserId = 'test-user-id';
      mockLocalDataStorageService.getUserId.mockResolvedValue(mockUserId);

      await (backgroundService as any).initializeUserId();

      expect(mockLocalDataStorageService.getUserId).toHaveBeenCalled();
      expect(mockDataSyncService.createUserId).not.toHaveBeenCalled();
      expect((backgroundService as any).userId).toBe(mockUserId);
    });

    it('should create a new userId if it does not exist in local storage', async () => {
      const mockUserId = 'new-user-id';
      mockLocalDataStorageService.getUserId.mockResolvedValue(null);
      mockDataSyncService.createUserId.mockResolvedValue(mockUserId);

      await (backgroundService as any).initializeUserId();

      expect(mockLocalDataStorageService.getUserId).toHaveBeenCalled();
      expect(mockDataSyncService.createUserId).toHaveBeenCalled();
      expect(mockLocalDataStorageService.setUserId).toHaveBeenCalledWith(
        mockUserId
      );
      expect((backgroundService as any).userId).toBe(mockUserId);
    });
  });

  describe('handleTabUpdated', () => {
    it('should not process tab update if tracking is disabled', async () => {
      (backgroundService as any).isTracking = false;
      (backgroundService as any).userId = 'test-user-id';

      await (backgroundService as any).handleTabUpdated(
        1,
        { status: 'complete' },
        {} as chrome.tabs.Tab
      );

      expect(mockDataSyncService.saveActivityEvent).not.toHaveBeenCalled();
      expect(mockDataSyncService.saveQueryEvent).not.toHaveBeenCalled();
    });

    it('should process tab update when tracking is enabled and status is complete', async () => {
      (backgroundService as any).isTracking = true;
      (backgroundService as any).userId = 'test-user-id';
      const mockTab = {
        url: 'https://example.com',
        title: 'Example',
      } as chrome.tabs.Tab;

      await (backgroundService as any).handleTabUpdated(
        1,
        { status: 'complete' },
        mockTab
      );

      expect(mockDataSyncService.saveActivityEvent).toHaveBeenCalled();
    });
  });

  describe('processTabUpdate', () => {
    it('should save activity event for regular page visit', async () => {
      (backgroundService as any).userId = 'test-user-id';
      const mockTab = {
        url: 'https://example.com',
        title: 'Example',
      } as chrome.tabs.Tab;

      await (backgroundService as any).processTabUpdate(1, mockTab);

      expect(mockDataSyncService.saveActivityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'visit_page',
          url: 'https://example.com',
          title: 'Example',
          userId: 'test-user-id',
        })
      );
    });

    it('should save activity and query events for Google search page', async () => {
      (backgroundService as any).userId = 'test-user-id';
      const mockTab = {
        url: 'https://www.google.com/search?q=test',
        title: 'test - Google Search',
      } as chrome.tabs.Tab;

      await (backgroundService as any).processTabUpdate(1, mockTab);

      expect(mockDataSyncService.saveActivityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'search_page',
          url: 'https://www.google.com/search?q=test',
          title: 'test',
          userId: 'test-user-id',
        })
      );
      expect(mockDataSyncService.saveQueryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'test',
          userId: 'test-user-id',
        })
      );
    });
  });

  describe('parseTab', () => {
    it('should parse new tab correctly', () => {
      const mockTab = {
        active: true,
        url: 'chrome://newtab/',
      } as chrome.tabs.Tab;
      const result = (backgroundService as any).parseTab(mockTab);
      expect(result).toEqual({ type: 'new_tab' });
    });

    it('should parse Google search page correctly', () => {
      const mockTab = {
        url: 'https://www.google.com/search?q=test',
        title: 'test - Google Search',
      } as chrome.tabs.Tab;
      const result = (backgroundService as any).parseTab(mockTab);
      expect(result).toEqual({
        type: 'search_page',
        url: 'https://www.google.com/search?q=test',
        title: 'test',
      });
    });

    it('should parse regular page visit correctly', () => {
      const mockTab = {
        url: 'https://example.com',
        title: 'Example',
      } as chrome.tabs.Tab;
      const result = (backgroundService as any).parseTab(mockTab);
      expect(result).toEqual({
        type: 'visit_page',
        url: 'https://example.com',
        title: 'Example',
      });
    });
  });

  describe('handleMessage', () => {
    it('should handle GET_TRACKING_STATUS message', () => {
      const sendResponse = jest.fn();
      (backgroundService as any).isTracking = true;

      (backgroundService as any).handleMessage(
        { action: 'GET_TRACKING_STATUS' },
        {},
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith({ isTracking: true });
    });

    it('should handle TOGGLE_PERMISSION message', () => {
      const sendResponse = jest.fn();
      (backgroundService as any).isTracking = false;

      (backgroundService as any).handleMessage(
        { action: 'TOGGLE_PERMISSION' },
        {},
        sendResponse
      );

      expect((backgroundService as any).isTracking).toBe(true);
      expect(sendResponse).toHaveBeenCalledWith({ isTracking: true });
    });

    it('should handle GET_NOT_SCORED_SEARCH_QUERIES message', async () => {
      const sendResponse = jest.fn();
      (backgroundService as any).userId = 'test-user-id';
      mockDataSyncService.getUnratedQueries.mockResolvedValue([
        {
          id: 'query1',
          score: 0,
          content: 'query1',
          tabId: 1,
          timestamp: 1,
          userId: 'test-user-id',
        },
        {
          id: 'query2',
          score: 0,
          content: 'query2',
          tabId: 1,
          timestamp: 1,
          userId: 'test-user-id',
        },
      ]);

      await (backgroundService as any).handleMessage(
        { action: 'GET_NOT_SCORED_SEARCH_QUERIES' },
        {},
        sendResponse
      );

      expect(mockDataSyncService.getUnratedQueries).toHaveBeenCalledWith(
        'test-user-id'
      );
      expect(sendResponse).toHaveBeenCalledWith({
        queries: ['query1', 'query2'],
      });
    });

    it('should handle UPDATE_SEARCH_QUERY_SCORE message', async () => {
      const sendResponse = jest.fn();
      (backgroundService as any).userId = 'test-user-id';
      const event = { id: 'query1', score: 5 };

      await (backgroundService as any).handleMessage(
        { action: 'UPDATE_SEARCH_QUERY_SCORE', event },
        {},
        sendResponse
      );

      expect(mockDataSyncService.updateQueryScore).toHaveBeenCalledWith(
        'test-user-id',
        event
      );
      expect(mockDataSyncService.getUnratedQueries).toHaveBeenCalledWith(
        'test-user-id'
      );
    });
  });

  describe('setupListeners', () => {
    it('should set up correct listeners', () => {
      (backgroundService as any).setupListeners();

      expect(mockBrowserMessageService.addListener).toHaveBeenCalledWith(
        BrowserEvent.OnTabUpdated,
        expect.any(Function)
      );
      expect(mockBrowserMessageService.addListener).toHaveBeenCalledWith(
        BrowserEvent.OnMessage,
        expect.any(Function)
      );
    });
  });
});
