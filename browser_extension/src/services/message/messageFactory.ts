import BrowserMessageService, {
  ChromeBrowserMessageService,
} from './browserMessage';

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
