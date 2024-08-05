import { ParsedTab } from '../types';
import BrowserMessageService from './message/browserMessage';
import DataSyncService from './dataSync';
import LocalDataStorageService from './localDataStorage';
import { BrowserEvent } from './message/browserEvent';

class BackgroundService {
  private isTracking: boolean = true;
  private userId: string | null = null;
  private dataSyncService: DataSyncService;
  private localDataStorageService: LocalDataStorageService;
  private browserMessageService: BrowserMessageService;

  constructor(
    dataSyncService: DataSyncService,
    localDataStorageService: LocalDataStorageService,
    browserMessageService: BrowserMessageService
  ) {
    this.dataSyncService = dataSyncService;
    this.localDataStorageService = localDataStorageService;
    this.browserMessageService = browserMessageService;
  }

  public async start() {
    await this.initializeUserId();
    this.setupListeners();
  }

  private async initializeUserId() {
    try {
      this.userId = await this.localDataStorageService.getUserId();
      if (!this.userId) {
        this.userId = await this.dataSyncService.createUserId();
        await this.localDataStorageService.setUserId(this.userId);
      }
    } catch (error) {
      this.userId = null;
    }
  }

  private setupListeners() {
    this.browserMessageService.addListener(
      BrowserEvent.OnTabUpdated,
      this.handleTabUpdated.bind(this)
    );
    this.browserMessageService.addListener(
      BrowserEvent.OnMessage,
      this.handleMessage.bind(this)
    );
  }

  private async handleTabUpdated(
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab
  ) {
    if (!this.isTracking) return;

    if (changeInfo.status === 'complete') {
      await this.processTabUpdate(tabId, tab);
    }
  }

  private async processTabUpdate(tabId: number, tab: chrome.tabs.Tab) {
    if (!this.userId) return;
    if (!tab.url || !tab.title) return;

    const parsedTab = this.parseTab(tab.title, tab.url);
    const event = {
      ...parsedTab,
      timestamp: Date.now(),
      tabId,
      userId: this.userId,
    };

    await this.dataSyncService.saveActivityEvent(event);

    if (event.type === 'search_page' && event.title) {
      await this.dataSyncService.saveQueryEvent({
        content: event.title,
        tabId,
        timestamp: Date.now(),
        userId: this.userId,
      });
    }
  }

  private parseTab(title: string, url: string): ParsedTab {
    if (this.isNewTab(url)) {
      return { type: 'new_tab', url, title };
    }

    if (this.isGoogleSearchPage(url)) {
      return {
        type: 'search_page',
        url,
        title: title.replace('- Google Search', '').trim(),
      };
    }

    return {
      type: 'visit_page',
      url,
      title,
    };
  }

  private isGoogleSearchPage(url: string): boolean {
    return url.includes('google.com/search');
  }

  private isNewTab(url: string): boolean {
    return url.includes('chrome://newtab');
  }

  private handleMessage(
    request: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) {
    switch (request.action) {
      case 'GET_TRACKING_STATUS':
        sendResponse({ isTracking: this.isTracking });
        break;
      case 'TOGGLE_PERMISSION':
        this.isTracking = !this.isTracking;
        sendResponse({ isTracking: this.isTracking });
        break;
      case 'GET_NOT_SCORED_SEARCH_QUERIES':
        this.getNotScoredSearchQueries(sendResponse);
        return true;
      case 'UPDATE_SEARCH_QUERY_SCORE':
        this.updateSearchQueryScore(request.event, sendResponse);
        return true;
    }
  }

  private async getNotScoredSearchQueries(
    sendResponse: (response: any) => void
  ) {
    try {
      if (!this.userId) return;
      const queries = await this.dataSyncService.getUnratedQueries(this.userId);
      sendResponse({ queries });
    } catch (error) {
      sendResponse({ error: (error as Error).message });
    }
  }

  private async updateSearchQueryScore(
    event: { id: string; score: number },
    sendResponse: (response: any) => void
  ) {
    try {
      if (!this.userId) return;
      await this.dataSyncService.updateQueryScore(this.userId, event);
      await this.getNotScoredSearchQueries(sendResponse);
    } catch (error) {
      sendResponse({ error: (error as Error).message });
    }
  }
}

export default BackgroundService;
