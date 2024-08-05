import { BrowserEvent } from './browserEvent';

interface BrowserMessageService {
  addListener(event: BrowserEvent, listener: (...event: any) => void): void;
}

export class ChromeBrowserMessageService implements BrowserMessageService {
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

export default BrowserMessageService;
