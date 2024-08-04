'use strict';

let isTracking: boolean = true;
let userId: string | null = null;
const API_ENDPOINT = 'https://iwqz3yaml1.execute-api.us-east-1.amazonaws.com';

chrome.storage.local.get(['userId'], (result) => {
  if (result.userId) {
    userId = result.userId;
  } else {
    initializeUserId();
  }
});

async function initializeUserId() {
  try {
    const response = await fetch(`${API_ENDPOINT}/userId`, { method: 'POST' });
    const data = await response.json();
    userId = data.userId;
    chrome.storage.local.set({ userId: userId });
  } catch (error) {
    userId = null;
  }
}

chrome.tabs.onUpdated.addListener(
  (
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab
  ) => {
    if (!isTracking || !userId) return;

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

async function handleTabUpdated(tabId: number, tab: chrome.tabs.Tab) {
  const parsedTab = parseTab(tab);
  const event = {
    ...parsedTab,
    timestamp: Date.now(),
    tabId,
    userId,
  };

  await saveEvent(event);

  if (event.type === 'search_page' && event.title) {
    await saveQuery(event.title, tabId);
  }
}

async function saveQuery(content: string, tabId: number) {
  try {
    await fetch(`${API_ENDPOINT}/query/${userId}`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        tabId,
        timestamp: Date.now(),
      }),
    });
  } catch (error) {
    console.error('error', error);
  }
}

async function saveEvent(event: any) {
  try {
    await fetch(`${API_ENDPOINT}/activity/${userId}`, {
      method: 'POST',
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.error('error', error);
  }
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
      case 'GET_NOT_SCORED_SEARCH_QUERIES':
        getNotScoredSearchQueries(sendResponse);
        return true;
      case 'UPDATE_SEARCH_QUERY_SCORE':
        updateSearchQueryScore(request.event, sendResponse);
        return true;
    }
  }
);

async function getNotScoredSearchQueries(
  sendResponse: (response: any) => void
) {
  try {
    const response = await fetch(
      `${API_ENDPOINT}/queries/emptyScore/${userId}`
    );
    const queries = await response.json();
    sendResponse({ queries });
  } catch (error) {
    console.error('error', error);
    sendResponse({ error: (error as Error).message });
  }
}

async function updateSearchQueryScore(
  event: { id: string; score: number },
  sendResponse: (response: any) => void
) {
  try {
    console.log('event', event);
    const response = await fetch(
      `${API_ENDPOINT}/query/${userId}/${event.id}`,
      {
        method: 'PUT',
        body: JSON.stringify({ score: event.score }),
      }
    );
    const data = await response.json();
    console.log('data search', data);
    getNotScoredSearchQueries(sendResponse);
  } catch (error) {
    console.error('error', error);
    sendResponse({ error: (error as Error).message });
  }
}
