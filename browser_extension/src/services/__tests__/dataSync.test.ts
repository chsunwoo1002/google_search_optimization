import { enableFetchMocks } from 'jest-fetch-mock';
enableFetchMocks();
import DataSyncService from '../dataSync';
import {
  DataSyncConfig,
  QueryEventResponse,
  UserActivityEvent,
  UserQueryEvent,
} from '../../types';

describe('DataSyncService', () => {
  let dataSyncService: DataSyncService;
  const mockConfig: DataSyncConfig = {
    API_ENDPOINT: 'https://api.example.com',
  };

  beforeEach(() => {
    fetchMock.resetMocks();
    dataSyncService = new DataSyncService(mockConfig);
  });

  test('createUserId should return a new user ID', async () => {
    const mockUserId = 'user123';
    fetchMock.mockResponseOnce(JSON.stringify({ userId: mockUserId }));

    const result = await dataSyncService.createUserId();
    expect(result).toBe(mockUserId);
    expect(fetchMock).toHaveBeenCalledWith(
      `${mockConfig.API_ENDPOINT}/userId`,
      {
        method: 'POST',
      }
    );
  });

  test('saveActivityEvent should send activity event to the server', async () => {
    const mockEvent: UserActivityEvent = {
      userId: 'user123',
      type: 'click',
      timestamp: Date.now(),
      tabId: 1,
    };
    fetchMock.mockResponseOnce(JSON.stringify({}));

    await dataSyncService.saveActivityEvent(mockEvent);
    expect(fetchMock).toHaveBeenCalledWith(
      `${mockConfig.API_ENDPOINT}/activity/${mockEvent.userId}`,
      {
        method: 'POST',
        body: JSON.stringify(mockEvent),
      }
    );
  });

  test('saveQueryEvent should send query event to the server', async () => {
    const mockEvent: UserQueryEvent = {
      userId: 'user123',
      content: 'test query',
      tabId: 1,
      timestamp: Date.now(),
    };
    fetchMock.mockResponseOnce(JSON.stringify({}));

    await dataSyncService.saveQueryEvent(mockEvent);
    expect(fetchMock).toHaveBeenCalledWith(
      `${mockConfig.API_ENDPOINT}/query/${mockEvent.userId}`,
      {
        method: 'POST',
        body: JSON.stringify({
          content: mockEvent.content,
          tabId: mockEvent.tabId,
          timestamp: mockEvent.timestamp,
        }),
      }
    );
  });

  test('getUnratedQueries should fetch unrated queries for a user', async () => {
    const mockUserId = 'user123';
    const mockQueries: QueryEventResponse[] = [
      {
        id: 'query1',
        content: 'test query',
        score: null,
        tabId: 1,
        timestamp: Date.now(),
        userId: mockUserId,
      },
      {
        id: 'query2',
        content: 'test query 2',
        score: null,
        tabId: 2,
        timestamp: Date.now(),
        userId: mockUserId,
      },
    ];
    fetchMock.mockResponseOnce(JSON.stringify(mockQueries));

    const result = await dataSyncService.getUnratedQueries(mockUserId);
    expect(result).toEqual(mockQueries);
    expect(fetchMock).toHaveBeenCalledWith(
      `${mockConfig.API_ENDPOINT}/queries/emptyScore/${mockUserId}`
    );
  });

  test('updateQueryScore should update the score for a query', async () => {
    const mockUserId = 'user123';
    const mockEvent = { id: 'docId', score: 5 };
    const mockResponse = { success: true };
    fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

    const result = await dataSyncService.updateQueryScore(
      mockUserId,
      mockEvent
    );
    expect(result).toEqual(mockResponse);
    expect(fetchMock).toHaveBeenCalledWith(
      `${mockConfig.API_ENDPOINT}/query/${mockUserId}/${mockEvent.id}`,
      {
        method: 'PUT',
        body: JSON.stringify({ score: mockEvent.score }),
      }
    );
  });
});
