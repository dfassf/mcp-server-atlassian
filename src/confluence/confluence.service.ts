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

  /**
   * CQL로 페이지 검색
   */
  async search(cql: string, limit = 25): Promise<ConfluenceSearchResult> {
    return this.http.get<ConfluenceSearchResult>('confluence', '/rest/api/content/search', {
      params: { cql, limit },
    });
  }

  /**
   * 페이지 상세 조회
   */
  async getPage(pageId: string, expand?: string): Promise<ConfluencePage> {
    const defaultExpand = 'body.storage,version,space';
    return this.http.get<ConfluencePage>('confluence', `/rest/api/content/${pageId}`, {
      params: { expand: expand || defaultExpand },
    });
  }

  /**
   * 페이지 생성
   */
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

  /**
   * 페이지 수정
   */
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

  /**
   * 스페이스 목록 조회
   */
  async getSpaces(limit = 25): Promise<{ results: ConfluenceSpace[] }> {
    return this.http.get('confluence', '/rest/api/space', {
      params: { limit },
    });
  }

  /**
   * 스페이스 상세 조회
   */
  async getSpace(spaceKey: string): Promise<ConfluenceSpace> {
    return this.http.get<ConfluenceSpace>('confluence', `/rest/api/space/${spaceKey}`);
  }

  /**
   * 페이지 하위 페이지 조회
   */
  async getChildPages(pageId: string): Promise<{ results: ConfluencePage[] }> {
    return this.http.get('confluence', `/rest/api/content/${pageId}/child/page`);
  }

  /**
   * 페이지 삭제
   */
  async deletePage(pageId: string): Promise<void> {
    await this.http.delete('confluence', `/rest/api/content/${pageId}`);
  }

  /**
   * 페이지 댓글 조회
   */
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
