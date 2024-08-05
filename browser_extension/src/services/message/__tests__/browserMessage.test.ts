import { chrome } from 'jest-chrome';
import BrowserMessageService from '../browserMessage';
import { BrowserMessageServiceFactory } from '../messageFactory';
import { BrowserEvent } from '../browserEvent';

describe('BrowserMessageServiceFactory', () => {
  test('creates ChromeBrowserMessageService for Chrome browser', () => {
    const chromeService =
      BrowserMessageServiceFactory.createBrowserMessageService('chrome');
    expect(chromeService).toBeDefined();
    expect(chromeService.constructor.name).toBe('ChromeBrowserMessageService');
  });

  test('throws error for unsupported browsers', () => {
    expect(() => {
      BrowserMessageServiceFactory.createBrowserMessageService('firefox');
    }).toThrow('Browser not supported');

    expect(() => {
      BrowserMessageServiceFactory.createBrowserMessageService('safari');
    }).toThrow('Browser not supported');
  });

  test('returns unique instances for each call', () => {
    const service1 =
      BrowserMessageServiceFactory.createBrowserMessageService('chrome');
    const service2 =
      BrowserMessageServiceFactory.createBrowserMessageService('chrome');
    expect(service1).not.toBe(service2);
  });
});

describe('ChromeBrowserMessageService', () => {
  let service: BrowserMessageService;

  beforeEach(() => {
    service =
      BrowserMessageServiceFactory.createBrowserMessageService('chrome');
  });

  test('should add listener for OnTabUpdated event', () => {
    const mockListener = jest.fn();
    service.addListener(BrowserEvent.OnTabUpdated, mockListener);

    expect(chrome.tabs.onUpdated.hasListeners()).toBe(true);

    // Simulate tab update
    chrome.tabs.onUpdated.callListeners(
      1, // tabId
      { status: 'complete' }, // changeInfo
      {
        id: 1,
        url: 'https://example.com',
      } as chrome.tabs.Tab
    );

    expect(mockListener).toHaveBeenCalledWith(
      1,
      { status: 'complete' },
      { id: 1, url: 'https://example.com' }
    );
  });

  test('should add listener for OnMessage event', () => {
    const mockListener = jest.fn();
    service.addListener(BrowserEvent.OnMessage, mockListener);

    expect(chrome.runtime.onMessage.hasListeners()).toBe(true);

    // Simulate message
    const sendResponseSpy = jest.fn();
    chrome.runtime.onMessage.callListeners(
      { type: 'test' }, // message
      { id: 'sender' }, // sender
      sendResponseSpy // sendResponse
    );

    expect(mockListener).toHaveBeenCalledWith(
      { type: 'test' },
      { id: 'sender' },
      sendResponseSpy
    );
  });
});
