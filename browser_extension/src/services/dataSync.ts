import { DataSyncConfig, UserActivityEvent, UserQueryEvent } from '../types';

class DataSyncService {
  private config: DataSyncConfig;

  constructor(config: DataSyncConfig) {
    this.config = config;
  }

  async createUserId(): Promise<string> {
    const response = await fetch(`${this.config.API_ENDPOINT}/userId`, {
      method: 'POST',
    });
    const data = await response.json();
    return data.userId;
  }

  async saveActivityEvent(event: UserActivityEvent): Promise<void> {
    await fetch(`${this.config.API_ENDPOINT}/activity/${event.userId}`, {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  async saveQueryEvent(event: UserQueryEvent): Promise<void> {
    await fetch(`${this.config.API_ENDPOINT}/query/${event.userId}`, {
      method: 'POST',
      body: JSON.stringify({
        content: event.content,
        tabId: event.tabId,
        timestamp: event.timestamp,
      }),
    });
  }

  async getUnratedQueries(userId: string): Promise<any> {
    const response = await fetch(
      `${this.config.API_ENDPOINT}/queries/emptyScore/${userId}`
    );
    const data = await response.json();
    return data;
  }

  async updateQueryScore(
    userId: string,
    event: { id: string; score: number }
  ): Promise<any> {
    const response = await fetch(
      `${this.config.API_ENDPOINT}/query/${userId}/${event.id}`,
      {
        method: 'PUT',
        body: JSON.stringify({ score: event.score }),
      }
    );
    const data = await response.json();
    return data;
  }
}

export default DataSyncService;
