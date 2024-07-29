let isTracking = false;
let lastSearchQuery = "";

// Initialize IndexedDB
let db;
const dbName = "SearchBehaviorDB";
const dbVersion = 3;
const request = indexedDB.open(dbName, dbVersion);

request.onerror = (event) => {
  console.error("IndexedDB error:", event.target.error);
};

request.onsuccess = (event) => {
  db = event.target.result;
  console.log("Database opened successfully", event);
};

request.onupgradeneeded = (event) => {
  db = event.target.result;

  if (!db.objectStoreNames.contains("userActivities")) {
    const userEventsStore = db.createObjectStore("userActivities", {
      keyPath: "id",
      autoIncrement: true,
    });
    userEventsStore.createIndex("timestamp", "timestamp", {
      unique: false,
    });
    userEventsStore.createIndex("type", "type", { unique: false });
    userEventsStore.createIndex("url", "url", { unique: false });
    userEventsStore.createIndex("title", "title", { unique: false });
    userEventsStore.createIndex("tabId", "tabId", { unique: false });
    userEventsStore.createIndex("score", "score", { unique: false });
  }

  if (!db.objectStoreNames.contains("userScores")) {
    const userScoresStore = db.createObjectStore("userScores", {
      keyPath: "searchQuery",
    });

    userScoresStore.createIndex("searchQuery", "searchQuery", {
      unique: true,
    });
    userScoresStore.createIndex("score", "score", { unique: false });
  }
};

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!isTracking) return;

  if (changeInfo.status === "complete") {
    handleTabUpdated(tabId, tab);
  }
});

function handleTabUpdated(tabId, tab) {
  const parsedTab = parseTab(tab);
  const event = {
    ...parsedTab,
    timestamp: Date.now(),
    tabId,
  };

  saveEvent(event);

  if (event.type === "search_page") {
    saveScore(event.title);
  }
}

function saveScore(searchQuery) {
  if (!db) return;

  const transaction = db.transaction(["userScores"], "readwrite");
  const store = transaction.objectStore("userScores");

  // Check if the searchQuery already exists
  const getRequest = store.index("searchQuery").get(searchQuery);

  getRequest.onsuccess = (event) => {
    // If the searchQuery doesn't exist, add it with a null score
    if (!event.target.result) {
      const newScore = {
        searchQuery,
        score: null,
      };

      const addRequest = store.add(newScore);
    }
  };

  getRequest.onerror = (error) => {
    console.error("Error checking for existing search query:", error);
  };
}

function saveEvent(event) {
  if (!db) return;

  const transaction = db.transaction(["userActivities"], "readwrite");
  const store = transaction.objectStore("userActivities");
  const request = store.add(event);
}

function parseTab(tab) {
  if (isNewTab(tab)) {
    return {
      type: "new_tab",
    };
  }

  if (isGoogleSearchPage(tab.url)) {
    return {
      type: "search_page",
      url: tab.url,
      title: tab.title.replace("- Google Search", "").trim(),
    };
  }

  return {
    type: "visit_page",
    url: tab.url,
    title: tab.title,
  };
}

function isGoogleSearchPage(url) {
  return url.includes("google.com/search");
}

function isNewTab(tab) {
  return tab.active && tab.url === "chrome://newtab/";
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "GET_TRACKING_STATUS":
      sendResponse({ isTracking });
      break;
    case "TOGGLE_PERMISSION":
      isTracking = !isTracking;
      sendResponse({ isTracking });
      break;
    case "GET_NOT_SCORED_SEARCH_QUERIES":
      getNotScoredSearchQueries(sendResponse);
      return true; // Indicates that we want to send a response asynchronously
    case "UPDATE_SEARCH_QUERY_SCORE":
      updateSearchQueryScore(request.event, sendResponse);
      return true; // Indicates that we want to send a response asynchronously
  }
});

const getNotScoredSearchQueries = (sendResponse) => {
  if (!db) return;

  const transaction = db.transaction(["userScores"], "readonly");
  const store = transaction.objectStore("userScores");
  const req = store.getAll();

  req.onsuccess = (e) => {
    const notScoredQueries = e.target.result
      .filter((query) => query.score === null)
      .map((query) => query.searchQuery);

    sendResponse({ queries: notScoredQueries });
  };
};

const updateSearchQueryScore = (event, sendResponse) => {
  if (!db) return;

  const transaction = db.transaction(["userScores"], "readwrite");
  const store = transaction.objectStore("userScores");

  const req = store.get(event.searchQuery);

  req.onsuccess = (e) => {
    const score = e.target.result;
    score.score = event.score;
    const updateRequest = store.put(score);

    updateRequest.onsuccess = () => {
      getNotScoredSearchQueries(sendResponse);
    };

    updateRequest.onerror = (err) => {
      console.error("Error updating score:", err);
    };
  };
};
