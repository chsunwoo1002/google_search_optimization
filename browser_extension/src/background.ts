'use strict';

let isTracking: boolean = true;
let lastSearchQuery: string = '';

// Initialize IndexedDB
let db: IDBDatabase | null = null;
const dbName: string = 'SearchBehaviorDB';
const dbVersion: number = 3;
const request: IDBOpenDBRequest = indexedDB.open(dbName, dbVersion);

request.onerror = (event: Event) => {
  const target = event.target as IDBOpenDBRequest;
  console.error('IndexedDB error:', target.error);
};

request.onsuccess = (event: Event) => {
  const target = event.target as IDBOpenDBRequest;
  db = target.result;
  console.log('Database opened successfully', event);
};

request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
  const target = event.target as IDBOpenDBRequest;
  db = target.result;

  if (!db.objectStoreNames.contains('userActivities')) {
    const userEventsStore = db.createObjectStore('userActivities', {
      keyPath: 'id',
      autoIncrement: true,
    });
    userEventsStore.createIndex('timestamp', 'timestamp', {
      unique: false,
    });
    userEventsStore.createIndex('type', 'type', { unique: false });
    userEventsStore.createIndex('url', 'url', { unique: false });
    userEventsStore.createIndex('title', 'title', { unique: false });
    userEventsStore.createIndex('tabId', 'tabId', { unique: false });
    userEventsStore.createIndex('score', 'score', { unique: false });
  }

  if (!db.objectStoreNames.contains('userScores')) {
    const userScoresStore = db.createObjectStore('userScores', {
      keyPath: 'searchQuery',
    });

    userScoresStore.createIndex('searchQuery', 'searchQuery', {
      unique: true,
    });
    userScoresStore.createIndex('score', 'score', { unique: false });
  }
};

// Listen for tab updates
chrome.tabs.onUpdated.addListener(
  (
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab
  ) => {
    if (!isTracking) return;

    if (changeInfo.status === 'complete') {
      handleTabUpdated(tabId, tab);
    }
  }
);

interface ParsedTab {
  type: string;
  url?: string;
  title?: string;
}

function handleTabUpdated(tabId: number, tab: chrome.tabs.Tab) {
  const parsedTab: ParsedTab = parseTab(tab);
  const event = {
    ...parsedTab,
    timestamp: Date.now(),
    tabId,
  };

  saveEvent(event);

  if (event.type === 'search_page' && event.title) {
    saveScore(event.title);
  }
}

function saveScore(searchQuery: string) {
  if (!db) return;

  const transaction = db.transaction(['userScores'], 'readwrite');
  const store = transaction.objectStore('userScores');

  // Check if the searchQuery already exists
  const getRequest = store.index('searchQuery').get(searchQuery);

  getRequest.onsuccess = (event: Event) => {
    const target = event.target as IDBRequest;
    // If the searchQuery doesn't exist, add it with a null score
    if (!target.result) {
      const newScore = {
        searchQuery,
        score: null,
      };

      store.add(newScore);
    }
  };

  getRequest.onerror = (error: Event) => {
    console.error('Error checking for existing search query:', error);
  };
}

function saveEvent(event: any) {
  if (!db) return;

  const transaction = db.transaction(['userActivities'], 'readwrite');
  const store = transaction.objectStore('userActivities');
  store.add(event);
}

function parseTab(tab: chrome.tabs.Tab): ParsedTab {
  if (isNewTab(tab)) {
    return {
      type: 'new_tab',
    };
  }

  if (isGoogleSearchPage(tab.url)) {
    return {
      type: 'search_page',
      url: tab.url,
      title: tab.title ? tab.title.replace('- Google Search', '').trim() : '',
    };
  }

  return {
    type: 'visit_page',
    url: tab.url,
    title: tab.title,
  };
}

function isGoogleSearchPage(url: string | undefined): boolean {
  return url ? url.includes('google.com/search') : false;
}

function isNewTab(tab: chrome.tabs.Tab): boolean {
  return tab.active && tab.url === 'chrome://newtab/';
}

chrome.runtime.onMessage.addListener(
  (
    request: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    switch (request.action) {
      case 'GET_TRACKING_STATUS':
        sendResponse({ isTracking });
        break;
      case 'TOGGLE_PERMISSION':
        isTracking = !isTracking;
        sendResponse({ isTracking });
        break;
      case 'GET_ALL_EVENTS':
        getAllEvents(sendResponse);
        return true;
      case 'GET_NOT_SCORED_SEARCH_QUERIES':
        getNotScoredSearchQueries(sendResponse);
        return true; // Indicates that we want to send a response asynchronously
      case 'UPDATE_SEARCH_QUERY_SCORE':
        updateSearchQueryScore(request.event, sendResponse);
        return true; // Indicates that we want to send a response asynchronously
    }
  }
);

async function getAllEvents(sendResponse: (response: any) => void) {
  if (!db) return;
  try {
    const [events, scores] = await Promise.all([
      getAllUserActivities(),
      getAllUserScores(),
    ]);

    sendResponse({ events, scores });
  } catch (error) {
    sendResponse({ error: (error as Error).message });
  }
}

async function getAllUserActivities(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
    }

    const transaction = db!.transaction(['userActivities'], 'readonly');
    const store = transaction.objectStore('userActivities');
    const req = store.getAll();

    req.onsuccess = (e: Event) => {
      const target = e.target as IDBRequest;
      resolve(target.result);
    };

    req.onerror = () => {
      reject(new Error('Error getting all user activities'));
    };
  });
}

async function getAllUserScores(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
    }

    const transaction = db!.transaction(['userScores'], 'readonly');
    const store = transaction.objectStore('userScores');
    const req = store.getAll();

    req.onsuccess = (e: Event) => {
      const target = e.target as IDBRequest;
      resolve(target.result);
    };

    req.onerror = () => {
      reject(new Error('Error getting all user scores'));
    };
  });
}

function getNotScoredSearchQueries(sendResponse: (response: any) => void) {
  if (!db) return;

  const transaction = db.transaction(['userScores'], 'readonly');
  const store = transaction.objectStore('userScores');
  const req = store.getAll();

  req.onsuccess = (e: Event) => {
    const target = e.target as IDBRequest;
    const notScoredQueries = (target.result as any[])
      .filter((query) => query.score === null)
      .map((query) => query.searchQuery);

    sendResponse({ queries: notScoredQueries });
  };
}

function updateSearchQueryScore(
  event: { searchQuery: string; score: number },
  sendResponse: (response: any) => void
) {
  if (!db) return;

  const transaction = db.transaction(['userScores'], 'readwrite');
  const store = transaction.objectStore('userScores');

  const req = store.get(event.searchQuery);

  req.onsuccess = (e: Event) => {
    const target = e.target as IDBRequest;
    const score = target.result;
    score.score = event.score;
    const updateRequest = store.put(score);

    updateRequest.onsuccess = () => {
      getNotScoredSearchQueries(sendResponse);
    };

    updateRequest.onerror = (err: Event) => {
      console.error('Error updating score:', err);
    };
  };
}
