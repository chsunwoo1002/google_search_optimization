'use strict';

import DataSyncService from './services/dataSync';
import LocalDataStorageService from './services/localDataStorage';

import BackgroundService from './services/background';
import { API_ENDPOINT } from './utils/constant';
import { BrowserMessageServiceFactory } from './services/message/messageFactory';

const localDataStorageService = new LocalDataStorageService(
  chrome.storage.local
);

const dataSyncService = new DataSyncService({ API_ENDPOINT });
const browserMessageService =
  BrowserMessageServiceFactory.createBrowserMessageService('chrome');

const backgroundService = new BackgroundService(
  dataSyncService,
  localDataStorageService,
  browserMessageService
);

backgroundService.start();
