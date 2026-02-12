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

  /** CQL로 페이지 검색 */
  async search(cql: string, limit = 25): Promise<ConfluenceSearchResult> {
    return this.http.get<ConfluenceSearchResult>('confluence', '/rest/api/content/search', {
      params: { cql, limit },
    });
  }

  /**
   * 페이지 상세 조회 (v2 API)
   * v1 API의 expand=body.storage가 401을 반환하는 이슈로 v2 사용
   */
  async getPage(pageId: string): Promise<ConfluencePage> {
    const v2Page = await this.http.get<{
      id: string;
      title: string;
      status: string;
      spaceId: string;
      version: { number: number; createdAt: string; authorId: string };
      body?: { storage?: { value: string; representation: string } };
    }>('confluence', `/api/v2/pages/${pageId}`, {
      params: { 'body-format': 'storage' },
    });

    return {
      id: v2Page.id,
      type: 'page',
      status: v2Page.status,
      title: v2Page.title,
      version: { number: v2Page.version.number, when: v2Page.version.createdAt },
      body: v2Page.body?.storage
        ? { storage: { value: v2Page.body.storage.value, representation: v2Page.body.storage.representation } }
        : undefined,
    };
  }

  /** 페이지 생성 */
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

  /** 페이지 수정 */
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

  /** 스페이스 생성 */
  async createSpace(key: string, name: string, description?: string): Promise<ConfluenceSpace> {
    const body: Record<string, unknown> = {
      key,
      name,
      type: 'global',
    };

    if (description) {
      body.description = {
        plain: { value: description, representation: 'plain' },
      };
    }

    return this.http.post<ConfluenceSpace>('confluence', '/rest/api/space', body);
  }

  /** 스페이스 목록 조회 */
  async getSpaces(limit = 25): Promise<{ results: ConfluenceSpace[] }> {
    return this.http.get('confluence', '/rest/api/space', {
      params: { limit },
    });
  }

  /** 스페이스 단건 조회 */
  async getSpace(spaceKey: string): Promise<ConfluenceSpace> {
    return this.http.get<ConfluenceSpace>('confluence', `/rest/api/space/${spaceKey}`);
  }

  /** 하위 페이지 조회 */
  async getChildPages(pageId: string): Promise<{ results: ConfluencePage[] }> {
    return this.http.get('confluence', `/rest/api/content/${pageId}/child/page`);
  }

  /** 페이지 삭제 */
  async deletePage(pageId: string): Promise<void> {
    await this.http.delete('confluence', `/rest/api/content/${pageId}`);
  }

  /** 페이지 댓글 조회 */
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
