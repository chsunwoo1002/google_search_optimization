import { chrome } from 'jest-chrome';
import BackgroundService from '../background';
import DataSyncService from '../dataSync';
import LocalDataStorageService from '../localDataStorage';
import BrowserMessageService, {
  ChromeBrowserMessageService,
} from '../message/browserMessage';
import { API_ENDPOINT } from '../../utils/constant';
import { BrowserEvent } from '../message/browserEvent';

// configuring dependencies
jest.mock('../dataSync');
jest.mock('../localDataStorage');
jest.mock('../message/browserMessage', () => {
  return {
    ChromeBrowserMessageService: jest.fn().mockImplementation(() => {
      const listeners: any = {};
      return {
        addListener: jest.fn().mockImplementation((event, listener) => {
          listeners[event] = listener;
        }),
        listeners,
      };
    }),
  };
});

// test variables
const EXISTING_USER_ID = 'existingUserId';
const NEW_USER_ID = 'newUserId';
const TAB_ID = 1;
const CHANGE_INFO = {
  status: 'complete',
};
const SEARCH_TAB = {
  url: 'https://www.google.com/search?q=test',
  title: 'Test - Google Search',
  parsedTabTitle: 'Test',
};
const NEW_TAB = {
  url: 'chrome://newtab/',
  title: 'New Tab',
  active: true,
};

const EMPTY_URL_TAB = {
  url: undefined,
  title: 'New Tab',
  active: true,
};

const EMPTY_TITLE_TAB = {
  url: 'https://www.test.com',
  title: undefined,
  active: true,
};

const PAGE_TAB = {
  url: 'https://www.test.com',
  title: 'Test',
};
const TRACKING_STATUS_MSG = {
  action: 'GET_TRACKING_STATUS',
};
const TRACKING_TOGGLE_ACTION = {
  action: 'TOGGLE_PERMISSION',
};
const UNRATED_QUERIES_LIST_REQUEST = {
  action: 'GET_NOT_SCORED_SEARCH_QUERIES',
};
const UPDATE_SCORE_REQUEST = {
  action: 'UPDATE_SEARCH_QUERY_SCORE',
  event: {
    id: '1',
    score: 1,
  },
};
const ERROR_MESSAGE = 'Test Error';

describe('BackgroundService', () => {
  describe('Chrome Extension', () => {
    const dataSyncService = new DataSyncService({
      API_ENDPOINT,
    }) as jest.Mocked<DataSyncService>;
    const localDataStorageService = new LocalDataStorageService(
      chrome.storage.local
    ) as jest.Mocked<LocalDataStorageService>;
    const browserMessageService =
      new ChromeBrowserMessageService() as jest.Mocked<BrowserMessageService>;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('constructor', () => {
      it('should create an instance of BackgroundService', () => {
        const backgroundService = new BackgroundService(
          dataSyncService,
          localDataStorageService,
          browserMessageService
        );
        expect(backgroundService).toBeInstanceOf(BackgroundService);
      });
    });

    describe('start', () => {
      it('should start the background service', async () => {
        const backgroundService = new BackgroundService(
          dataSyncService,
          localDataStorageService,
          browserMessageService
        );
        await backgroundService.start();

        expect(localDataStorageService.getUserId).toHaveBeenCalledTimes(1);
        expect(browserMessageService.addListener).toHaveBeenCalledTimes(2);
        expect(browserMessageService.addListener).toHaveBeenCalledWith(
          BrowserEvent.OnTabUpdated,
          expect.any(Function)
        );
        expect(browserMessageService.addListener).toHaveBeenCalledWith(
          BrowserEvent.OnMessage,
          expect.any(Function)
        );
      });

      it('should create a new user id if it does not exist', async () => {
        localDataStorageService.getUserId.mockResolvedValue(null);
        dataSyncService.createUserId.mockResolvedValue(NEW_USER_ID);
        localDataStorageService.setUserId.mockResolvedValue();

        const backgroundService = new BackgroundService(
          dataSyncService,
          localDataStorageService,
          browserMessageService
        );

        await backgroundService.start();

        expect(localDataStorageService.getUserId).toHaveBeenCalledTimes(1);
        expect(dataSyncService.createUserId).toHaveBeenCalledTimes(1);
        expect(localDataStorageService.setUserId).toHaveBeenCalledTimes(1);

        // @ts-ignore
        expect(backgroundService.userId).toBe(NEW_USER_ID);
      });

      it('should not create a new user id if it already exists', async () => {
        localDataStorageService.getUserId.mockResolvedValue(EXISTING_USER_ID);

        const backgroundService = new BackgroundService(
          dataSyncService,
          localDataStorageService,
          browserMessageService
        );
        await backgroundService.start();

        expect(localDataStorageService.getUserId).toHaveBeenCalledTimes(1);
        expect(dataSyncService.createUserId).not.toHaveBeenCalled();
        expect(localDataStorageService.setUserId).not.toHaveBeenCalled();

        // @ts-ignore
        expect(backgroundService.userId).toBe(EXISTING_USER_ID);
      });

      it('should set user id as null if it throws an error', async () => {
        localDataStorageService.getUserId.mockResolvedValue(null);
        dataSyncService.createUserId.mockRejectedValue(new Error('Error'));

        const backgroundService = new BackgroundService(
          dataSyncService,
          localDataStorageService,
          browserMessageService
        );

        await backgroundService.start();

        // @ts-ignore
        expect(backgroundService.userId).toBe(null);
      });
    });

    describe('onTabUpdated', () => {
      it('should detect new tab and store it as activity event', async () => {
        localDataStorageService.getUserId.mockResolvedValue(EXISTING_USER_ID);
        dataSyncService.saveActivityEvent.mockResolvedValue();

        const backgroundService = new BackgroundService(
          dataSyncService,
          localDataStorageService,
          browserMessageService
        );
        await backgroundService.start();

        // @ts-ignore
        await browserMessageService.listeners[BrowserEvent.OnTabUpdated](
          TAB_ID,
          CHANGE_INFO,
          NEW_TAB
        );

        expect(dataSyncService.saveActivityEvent).toHaveBeenCalledTimes(1);
        expect(dataSyncService.saveActivityEvent).toHaveBeenCalledWith({
          userId: EXISTING_USER_ID,
          type: 'new_tab',
          timestamp: expect.any(Number),
          tabId: TAB_ID,
          url: NEW_TAB.url,
          title: NEW_TAB.title,
        });

        expect(dataSyncService.saveQueryEvent).not.toHaveBeenCalled();
      });

      it('should detect search page and store it as activity and query events ', async () => {
        localDataStorageService.getUserId.mockResolvedValue(EXISTING_USER_ID);
        dataSyncService.saveActivityEvent.mockResolvedValue();
        dataSyncService.saveQueryEvent.mockResolvedValue();

        const backgroundService = new BackgroundService(
          dataSyncService,
          localDataStorageService,
          browserMessageService
        );
        await backgroundService.start();

        // @ts-ignore
        await browserMessageService.listeners[BrowserEvent.OnTabUpdated](
          TAB_ID,
          CHANGE_INFO,
          SEARCH_TAB
        );

        expect(dataSyncService.saveActivityEvent).toHaveBeenCalledTimes(1);
        expect(dataSyncService.saveActivityEvent).toHaveBeenCalledWith({
          userId: EXISTING_USER_ID,
          type: 'search_page',
          url: SEARCH_TAB.url,
          title: SEARCH_TAB.parsedTabTitle,
          timestamp: expect.any(Number),
          tabId: TAB_ID,
        });
        expect(dataSyncService.saveQueryEvent).toHaveBeenCalledTimes(1);
        expect(dataSyncService.saveQueryEvent).toHaveBeenCalledWith({
          content: SEARCH_TAB.parsedTabTitle,
          tabId: TAB_ID,
          timestamp: expect.any(Number),
          userId: EXISTING_USER_ID,
        });
      });

      it('should detect visited page and store it as activity event', async () => {
        localDataStorageService.getUserId.mockResolvedValue(EXISTING_USER_ID);
        dataSyncService.saveActivityEvent.mockResolvedValue();

        const backgroundService = new BackgroundService(
          dataSyncService,
          localDataStorageService,
          browserMessageService
        );
        await backgroundService.start();

        // @ts-ignore
        await browserMessageService.listeners[BrowserEvent.OnTabUpdated](
          TAB_ID,
          CHANGE_INFO,
          PAGE_TAB
        );

        expect(dataSyncService.saveActivityEvent).toHaveBeenCalledTimes(1);
        expect(dataSyncService.saveActivityEvent).toHaveBeenCalledWith({
          userId: EXISTING_USER_ID,
          type: 'visit_page',
          timestamp: expect.any(Number),
          tabId: TAB_ID,
          url: PAGE_TAB.url,
          title: PAGE_TAB.title,
        });

        expect(dataSyncService.saveQueryEvent).not.toHaveBeenCalled();
      });

      it('should ignore if the tracking is set to false', async () => {
        localDataStorageService.getUserId.mockResolvedValue(EXISTING_USER_ID);

        const backgroundService = new BackgroundService(
          dataSyncService,
          localDataStorageService,
          browserMessageService
        );
        await backgroundService.start();

        // @ts-ignore
        backgroundService.isTracking = false;

        // @ts-ignore
        await browserMessageService.listeners[BrowserEvent.OnTabUpdated](
          TAB_ID,
          CHANGE_INFO,
          NEW_TAB
        );

        expect(dataSyncService.saveActivityEvent).not.toHaveBeenCalled();
      });

      it('should ignore if the userId is not set', async () => {
        localDataStorageService.getUserId.mockResolvedValue(null);
        dataSyncService.createUserId.mockRejectedValue(
          new Error(ERROR_MESSAGE)
        );

        const backgroundService = new BackgroundService(
          dataSyncService,
          localDataStorageService,
          browserMessageService
        );
        await backgroundService.start();

        // @ts-ignore
        await browserMessageService.listeners[BrowserEvent.OnTabUpdated](
          TAB_ID,
          CHANGE_INFO,
          SEARCH_TAB
        );
      });

      it('should ignore if the title or url is undefined', async () => {
        localDataStorageService.getUserId.mockResolvedValue(EXISTING_USER_ID);

        const backgroundService = new BackgroundService(
          dataSyncService,
          localDataStorageService,
          browserMessageService
        );
        await backgroundService.start();

        // @ts-ignore
        await browserMessageService.listeners[BrowserEvent.OnTabUpdated](
          TAB_ID,
          CHANGE_INFO,
          EMPTY_URL_TAB
        );

        expect(dataSyncService.saveActivityEvent).not.toHaveBeenCalled();

        // @ts-ignore
        await browserMessageService.listeners[BrowserEvent.OnTabUpdated](
          TAB_ID,
          CHANGE_INFO,
          EMPTY_TITLE_TAB
        );

        expect(dataSyncService.saveActivityEvent).not.toHaveBeenCalled();
      });
    });

    describe('onMessage', () => {
      it('should receive tracking status request and return tracking status', async () => {
        const backgroundService = new BackgroundService(
          dataSyncService,
          localDataStorageService,
          browserMessageService
        );
        await backgroundService.start();
        const sender = jest.fn();
        const sendResponse = jest.fn();
        // @ts-ignore
        await browserMessageService.listeners[BrowserEvent.OnMessage](
          TRACKING_STATUS_MSG,
          sender,
          sendResponse
        );

        // @ts-ignore
        expect(backgroundService.isTracking).toBe(true);
        expect(sendResponse).toHaveBeenCalledTimes(1);
        expect(sendResponse).toHaveBeenCalledWith({
          isTracking: true,
        });
      });

      it('should receive tracking toggle action and return new tracking status', async () => {
        const backgroundService = new BackgroundService(
          dataSyncService,
          localDataStorageService,
          browserMessageService
        );
        await backgroundService.start();

        // @ts-ignore
        expect(backgroundService.isTracking).toBe(true); // default value is true

        const sender = jest.fn();
        const sendResponse = jest.fn();
        // @ts-ignore
        await browserMessageService.listeners[BrowserEvent.OnMessage](
          TRACKING_TOGGLE_ACTION,
          sender,
          sendResponse
        );

        expect(sendResponse).toHaveBeenCalledTimes(1);
        expect(sendResponse).toHaveBeenCalledWith({
          isTracking: false,
        });
        // @ts-ignore
        expect(backgroundService.isTracking).toBe(false);
      });

      it('should receive unrated queries list request and return unrated queries list', async () => {
        localDataStorageService.getUserId.mockResolvedValue(EXISTING_USER_ID);
        dataSyncService.getUnratedQueries.mockResolvedValue([]);

        const backgroundService = new BackgroundService(
          dataSyncService,
          localDataStorageService,
          browserMessageService
        );
        await backgroundService.start();

        const sender = jest.fn();
        const sendResponse = jest.fn();
        // @ts-ignore
        await browserMessageService.listeners[BrowserEvent.OnMessage](
          UNRATED_QUERIES_LIST_REQUEST,
          sender,
          sendResponse
        );

        expect(dataSyncService.getUnratedQueries).toHaveBeenCalledTimes(1);
        expect(dataSyncService.getUnratedQueries).toHaveBeenCalledWith(
          EXISTING_USER_ID
        );
        expect(sendResponse).toHaveBeenCalledTimes(1);
        expect(sendResponse).toHaveBeenCalledWith({
          queries: [],
        });
      });

      it('should ignore unrated score queries list request if userId is not set', async () => {
        localDataStorageService.getUserId.mockResolvedValue(null);
        dataSyncService.getUnratedQueries.mockResolvedValue([]);

        const backgroundService = new BackgroundService(
          dataSyncService,
          localDataStorageService,
          browserMessageService
        );
        await backgroundService.start();

        const sender = jest.fn();
        const sendResponse = jest.fn();
        // @ts-ignore
        await browserMessageService.listeners[BrowserEvent.OnMessage](
          UNRATED_QUERIES_LIST_REQUEST,
          sender,
          sendResponse
        );

        expect(dataSyncService.getUnratedQueries).not.toHaveBeenCalled();
        expect(sendResponse).not.toHaveBeenCalled();
      });

      it('should receive unrated queries list request and return error message if there is an error', async () => {
        localDataStorageService.getUserId.mockResolvedValue(EXISTING_USER_ID);
        dataSyncService.getUnratedQueries.mockRejectedValue(
          new Error(ERROR_MESSAGE)
        );

        const backgroundService = new BackgroundService(
          dataSyncService,
          localDataStorageService,
          browserMessageService
        );
        await backgroundService.start();

        const sender = jest.fn();
        const sendResponse = jest.fn();
        // @ts-ignore
        await browserMessageService.listeners[BrowserEvent.OnMessage](
          UNRATED_QUERIES_LIST_REQUEST,
          sender,
          sendResponse
        );

        expect(dataSyncService.getUnratedQueries).toHaveBeenCalledTimes(1);
        expect(dataSyncService.getUnratedQueries).toHaveBeenCalledWith(
          EXISTING_USER_ID
        );
        expect(sendResponse).toHaveBeenCalledTimes(1);
        expect(sendResponse).toHaveBeenCalledWith({
          error: ERROR_MESSAGE,
        });
      });

      it('should receive update score request and update score', async () => {
        localDataStorageService.getUserId.mockResolvedValue(EXISTING_USER_ID);
        dataSyncService.updateQueryScore.mockResolvedValue(undefined);
        dataSyncService.getUnratedQueries.mockResolvedValue([]);

        const backgroundService = new BackgroundService(
          dataSyncService,
          localDataStorageService,
          browserMessageService
        );
        await backgroundService.start();

        const sender = jest.fn();
        const sendResponse = jest.fn();
        // @ts-ignore
        await browserMessageService.listeners[BrowserEvent.OnMessage](
          UPDATE_SCORE_REQUEST,
          sender,
          sendResponse
        );

        expect(dataSyncService.updateQueryScore).toHaveBeenCalledTimes(1);
        expect(dataSyncService.updateQueryScore).toHaveBeenCalledWith(
          EXISTING_USER_ID,
          {
            id: '1',
            score: 1,
          }
        );
        expect(dataSyncService.getUnratedQueries).toHaveBeenCalledTimes(1);
        expect(dataSyncService.getUnratedQueries).toHaveBeenCalledWith(
          EXISTING_USER_ID
        );
      });

      it('should ignore update score request if userId is not set', async () => {
        localDataStorageService.getUserId.mockResolvedValue(null);
        dataSyncService.updateQueryScore.mockResolvedValue(undefined);
        dataSyncService.getUnratedQueries.mockResolvedValue([]);

        const backgroundService = new BackgroundService(
          dataSyncService,
          localDataStorageService,
          browserMessageService
        );
        await backgroundService.start();

        const sender = jest.fn();
        const sendResponse = jest.fn();
        // @ts-ignore
        await browserMessageService.listeners[BrowserEvent.OnMessage](
          UPDATE_SCORE_REQUEST,
          sender,
          sendResponse
        );

        expect(dataSyncService.updateQueryScore).not.toHaveBeenCalled();
        expect(dataSyncService.getUnratedQueries).not.toHaveBeenCalled();
        expect(sendResponse).not.toHaveBeenCalled();
      });

      it('should receive update score request and return error message if there is an error', async () => {
        localDataStorageService.getUserId.mockResolvedValue(EXISTING_USER_ID);
        dataSyncService.updateQueryScore.mockRejectedValue(
          new Error(ERROR_MESSAGE)
        );
        dataSyncService.getUnratedQueries.mockResolvedValue([]);

        const backgroundService = new BackgroundService(
          dataSyncService,
          localDataStorageService,
          browserMessageService
        );
        await backgroundService.start();

        const sender = jest.fn();
        const sendResponse = jest.fn();
        // @ts-ignore
        await browserMessageService.listeners[BrowserEvent.OnMessage](
          UPDATE_SCORE_REQUEST,
          sender,
          sendResponse
        );

        expect(dataSyncService.updateQueryScore).toHaveBeenCalledTimes(1);
        expect(dataSyncService.updateQueryScore).toHaveBeenCalledWith(
          EXISTING_USER_ID,
          {
            id: '1',
            score: 1,
          }
        );
        expect(dataSyncService.getUnratedQueries).not.toHaveBeenCalled();
        expect(sendResponse).toHaveBeenCalledTimes(1);
        expect(sendResponse).toHaveBeenCalledWith({
          error: ERROR_MESSAGE,
        });
      });
    });
  });
});
