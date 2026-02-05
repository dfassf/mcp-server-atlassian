export interface ConfluenceSpace {
  id: number;
  key: string;
  name: string;
  type?: string;
  status?: string;
}

export interface ConfluenceVersion {
  number: number;
  when: string;
  by?: ConfluenceUser;
}

export interface ConfluenceUser {
  accountId?: string;
  displayName?: string;
  email?: string;
}

export interface ConfluenceBody {
  storage?: {
    value: string;
    representation: string;
  };
  view?: {
    value: string;
    representation: string;
  };
}

export interface ConfluencePage {
  id: string;
  type: string;
  status: string;
  title: string;
  space?: ConfluenceSpace;
  version?: ConfluenceVersion;
  body?: ConfluenceBody;
  ancestors?: ConfluencePage[];
  children?: {
    page?: {
      results: ConfluencePage[];
    };
  };
}

export interface ConfluenceSearchResult {
  results: ConfluencePage[];
  start: number;
  limit: number;
  size: number;
  totalSize?: number;
}
