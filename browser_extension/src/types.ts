export interface DataSyncConfig {
  API_ENDPOINT: string;
}

export interface BackgroundConfig {
  listeners: {
    onTabUpdated: (listener: (...event: any) => void) => void;
    onMessage: (listener: (...event: any) => void) => void;
  };
}

export interface UserActivityEvent extends ParsedTab {
  timestamp: number;
  tabId: number;
  userId: string;
}

export interface UserQueryEvent {
  content: string;
  tabId: number;
  timestamp: number;
  userId: string;
}

export interface ParsedTab {
  type: string;
  url?: string;
  title?: string;
}
