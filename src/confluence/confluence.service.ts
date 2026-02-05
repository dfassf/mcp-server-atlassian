import { Injectable } from '@nestjs/common';
import { AtlassianHttpService } from '../common/http/atlassian-http.service';
import {
  ConfluencePage,
  ConfluenceSearchResult,
  ConfluenceSpace,
} from '../types/confluence.types';

@Injectable()
export class ConfluenceService {
  constructor(private http: AtlassianHttpService) {}

  async search(cql: string, limit = 25): Promise<ConfluenceSearchResult> {
    return this.http.get<ConfluenceSearchResult>('confluence', '/rest/api/content/search', {
      params: { cql, limit },
    });
  }

  async getPage(pageId: string, expand?: string): Promise<ConfluencePage> {
    const defaultExpand = 'body.storage,version,space';
    return this.http.get<ConfluencePage>('confluence', `/rest/api/content/${pageId}`, {
      params: { expand: expand || defaultExpand },
    });
  }

  async createPage(
    spaceKey: string,
    title: string,
    content: string,
    parentId?: string,
  ): Promise<ConfluencePage> {
    const body: Record<string, unknown> = {
      type: 'page',
      title,
      space: { key: spaceKey },
      body: {
        storage: {
          value: content,
          representation: 'storage',
        },
      },
    };

    if (parentId) {
      body.ancestors = [{ id: parentId }];
    }

    return this.http.post<ConfluencePage>('confluence', '/rest/api/content', body);
  }

  async updatePage(
    pageId: string,
    title: string,
    content: string,
    version: number,
  ): Promise<ConfluencePage> {
    return this.http.put<ConfluencePage>('confluence', `/rest/api/content/${pageId}`, {
      type: 'page',
      title,
      body: {
        storage: {
          value: content,
          representation: 'storage',
        },
      },
      version: {
        number: version + 1,
      },
    });
  }

  async getSpaces(limit = 25): Promise<{ results: ConfluenceSpace[] }> {
    return this.http.get('confluence', '/rest/api/space', {
      params: { limit },
    });
  }

  async getSpace(spaceKey: string): Promise<ConfluenceSpace> {
    return this.http.get<ConfluenceSpace>('confluence', `/rest/api/space/${spaceKey}`);
  }

  async getChildPages(pageId: string): Promise<{ results: ConfluencePage[] }> {
    return this.http.get('confluence', `/rest/api/content/${pageId}/child/page`);
  }

  async deletePage(pageId: string): Promise<void> {
    await this.http.delete('confluence', `/rest/api/content/${pageId}`);
  }

  async getComments(pageId: string): Promise<{
    results: {
      id: string;
      title: string;
      body: { storage: { value: string } };
      version: { by: { displayName: string }; when: string };
    }[];
  }> {
    return this.http.get('confluence', `/rest/api/content/${pageId}/child/comment`, {
      params: { expand: 'body.storage,version' },
    });
  }
}
