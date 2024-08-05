'use strict';

import DataSyncService from './services/dataSync';
import LocalDataStorageService from './services/localDataStorage';
import { BrowserMessageServiceFactory } from './services/browserMessage';
import { DataSyncConfig } from './types';
import BackgroundService from './services/background';

// Usage
const localDataStorageService = new LocalDataStorageService(
  chrome.storage.local
);
const dataSyncConfig: DataSyncConfig = {
  API_ENDPOINT: 'https://iwqz3yaml1.execute-api.us-east-1.amazonaws.com',
};
const dataSyncService = new DataSyncService(dataSyncConfig);
const browserMessageService =
  BrowserMessageServiceFactory.createBrowserMessageService('chrome');

const backgroundService = new BackgroundService(
  dataSyncService,
  localDataStorageService,
  browserMessageService
);
