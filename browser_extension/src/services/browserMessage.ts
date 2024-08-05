export enum BrowserEvent {
  OnTabUpdated = 'onTabUpdated',
  OnMessage = 'onMessage',
}

interface BrowserMessageService {
  addListener(event: BrowserEvent, listener: (...event: any) => void): void;
}

class ChromeBrowserMessageService implements BrowserMessageService {
  constructor() {}

  addListener(event: BrowserEvent, listener: (...event: any) => void) {
    switch (event) {
      case BrowserEvent.OnTabUpdated:
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
          listener(tabId, changeInfo, tab);
        });
        break;
      case BrowserEvent.OnMessage:
        chrome.runtime.onMessage.addListener(
          (message, sender, sendResponse) => {
            return listener(message, sender, sendResponse);
          }
        );
    }
  }
}

export class BrowserMessageServiceFactory {
  static createBrowserMessageService(browser: string): BrowserMessageService {
    switch (browser) {
      case 'chrome':
        return new ChromeBrowserMessageService();
      default:
        throw new Error('Browser not supported');
    }
  }
}

export default BrowserMessageService;
