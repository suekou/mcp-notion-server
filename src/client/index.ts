/**
 * Notion API client wrapper
 */

import { convertToMarkdown } from "../markdown/index.js";
import {
  NotionResponse,
  BlockResponse,
  PageResponse,
  DatabaseResponse,
  ListResponse,
  UserResponse,
  CommentResponse,
  RichTextItemResponse,
  CreateDatabaseArgs,
} from "../types/index.js";
import fetch from "node-fetch";

export class NotionClientWrapper {
  private notionToken: string;
  private baseUrl: string = "https://api.notion.com/v1";
  private headers: { [key: string]: string };

  constructor(token: string) {
    this.notionToken = token;
    this.headers = {
      Authorization: `Bearer ${this.notionToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    };
  }

  async appendBlockChildren(
    block_id: string,
    children: Partial<BlockResponse>[]
  ): Promise<BlockResponse> {
    const body = { children };

    const response = await fetch(
      `${this.baseUrl}/blocks/${block_id}/children`,
      {
        method: "PATCH",
        headers: this.headers,
        body: JSON.stringify(body),
      }
    );

    return response.json();
  }

  async retrieveBlock(block_id: string): Promise<BlockResponse> {
    const response = await fetch(`${this.baseUrl}/blocks/${block_id}`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async retrieveBlockChildren(
    block_id: string,
    start_cursor?: string,
    page_size?: number
  ): Promise<ListResponse> {
    const params = new URLSearchParams();
    if (start_cursor) params.append("start_cursor", start_cursor);
    if (page_size) params.append("page_size", page_size.toString());

    const response = await fetch(
      `${this.baseUrl}/blocks/${block_id}/children?${params}`,
      {
        method: "GET",
        headers: this.headers,
      }
    );

    return response.json();
  }

  async deleteBlock(block_id: string): Promise<BlockResponse> {
    const response = await fetch(`${this.baseUrl}/blocks/${block_id}`, {
      method: "DELETE",
      headers: this.headers,
    });

    return response.json();
  }

  async updateBlock(
    block_id: string,
    block: Partial<BlockResponse>
  ): Promise<BlockResponse> {
    const response = await fetch(`${this.baseUrl}/blocks/${block_id}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(block),
    });

    return response.json();
  }

  async retrievePage(page_id: string): Promise<PageResponse> {
    const response = await fetch(`${this.baseUrl}/pages/${page_id}`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async updatePageProperties(
    page_id: string,
    properties: Record<string, any>
  ): Promise<PageResponse> {
    const body = { properties };

    const response = await fetch(`${this.baseUrl}/pages/${page_id}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  async listAllUsers(
    start_cursor?: string,
    page_size?: number
  ): Promise<ListResponse> {
    const params = new URLSearchParams();
    if (start_cursor) params.append("start_cursor", start_cursor);
    if (page_size) params.append("page_size", page_size.toString());

    const response = await fetch(`${this.baseUrl}/users?${params.toString()}`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  async retrieveUser(user_id: string): Promise<UserResponse> {
    const response = await fetch(`${this.baseUrl}/users/${user_id}`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  async retrieveBotUser(): Promise<UserResponse> {
    const response = await fetch(`${this.baseUrl}/users/me`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  async createDatabase(
    parent: CreateDatabaseArgs["parent"],
    properties: Record<string, any>,
    title?: RichTextItemResponse[]
  ): Promise<DatabaseResponse> {
    const body = { parent, title, properties };

    const response = await fetch(`${this.baseUrl}/databases`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  async queryDatabase(
    database_id: string,
    filter?: Record<string, any>,
    sorts?: Array<{
      property?: string;
      timestamp?: string;
      direction: "ascending" | "descending";
    }>
  ): Promise<ListResponse> {
    const allResults: ListResponse["results"] = [];
    let cursor: string | undefined;

    do {
      const body: Record<string, any> = { page_size: 100 };
      if (filter) body.filter = filter;
      if (sorts) body.sorts = sorts;
      if (cursor) body.start_cursor = cursor;

      const response = await fetch(
        `${this.baseUrl}/databases/${database_id}/query`,
        {
          method: "POST",
          headers: this.headers,
          body: JSON.stringify(body),
        }
      );

      const page: ListResponse = await response.json();
      allResults.push(...page.results);
      cursor = page.has_more ? (page.next_cursor ?? undefined) : undefined;
    } while (cursor);

    return {
      object: "list",
      results: allResults,
      has_more: false,
      next_cursor: null,
    };
  }

  async retrieveDatabase(database_id: string): Promise<DatabaseResponse> {
    const response = await fetch(`${this.baseUrl}/databases/${database_id}`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async updateDatabase(
    database_id: string,
    title?: RichTextItemResponse[],
    description?: RichTextItemResponse[],
    properties?: Record<string, any>
  ): Promise<DatabaseResponse> {
    const body: Record<string, any> = {};
    if (title) body.title = title;
    if (description) body.description = description;
    if (properties) body.properties = properties;

    const response = await fetch(`${this.baseUrl}/databases/${database_id}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  async createPage(
    parent: { type: string; page_id?: string; database_id?: string },
    properties: Record<string, any>,
    children?: Partial<BlockResponse>[],
    icon?: { type: string; emoji?: string; external?: { url: string } },
    cover?: { type: string; external?: { url: string } }
  ): Promise<PageResponse> {
    const body: Record<string, any> = { parent, properties };
    if (children) body.children = children;
    if (icon) body.icon = icon;
    if (cover) body.cover = cover;

    const response = await fetch(`${this.baseUrl}/pages`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  async createDatabaseItem(
    database_id: string,
    properties: Record<string, any>
  ): Promise<PageResponse> {
    const body = {
      parent: { database_id },
      properties,
    };

    const response = await fetch(`${this.baseUrl}/pages`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  async archivePage(
    page_id: string,
    archived: boolean
  ): Promise<PageResponse> {
    const response = await fetch(`${this.baseUrl}/pages/${page_id}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify({ archived }),
    });

    return response.json();
  }

  async retrievePagePropertyItem(
    page_id: string,
    property_id: string
  ): Promise<any> {
    const allResults: any[] = [];
    let cursor: string | undefined;
    let propertyItem: any;

    do {
      const params = new URLSearchParams();
      if (cursor) params.append("start_cursor", cursor);
      params.append("page_size", "100");

      const response = await fetch(
        `${this.baseUrl}/pages/${page_id}/properties/${property_id}?${params}`,
        {
          method: "GET",
          headers: this.headers,
        }
      );

      propertyItem = await response.json();

      if (propertyItem.object === "list") {
        allResults.push(...propertyItem.results);
        cursor = propertyItem.has_more
          ? (propertyItem.next_cursor ?? undefined)
          : undefined;
      } else {
        return propertyItem;
      }
    } while (cursor);

    return {
      object: "list",
      results: allResults,
      has_more: false,
      next_cursor: null,
      type: propertyItem?.type,
      property_item: propertyItem?.property_item,
    };
  }

  async createComment(
    parent?: { page_id: string },
    discussion_id?: string,
    rich_text?: RichTextItemResponse[]
  ): Promise<CommentResponse> {
    const body: Record<string, any> = { rich_text };
    if (parent) {
      body.parent = parent;
    }
    if (discussion_id) {
      body.discussion_id = discussion_id;
    }

    const response = await fetch(`${this.baseUrl}/comments`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  async retrieveComments(
    block_id: string,
    start_cursor?: string,
    page_size?: number
  ): Promise<ListResponse> {
    const params = new URLSearchParams();
    params.append("block_id", block_id);
    if (start_cursor) params.append("start_cursor", start_cursor);
    if (page_size) params.append("page_size", page_size.toString());

    const response = await fetch(
      `${this.baseUrl}/comments?${params.toString()}`,
      {
        method: "GET",
        headers: this.headers,
      }
    );

    return response.json();
  }

  async search(
    query?: string,
    filter?: { property: string; value: string },
    sort?: {
      direction: "ascending" | "descending";
      timestamp: "last_edited_time";
    }
  ): Promise<ListResponse> {
    const allResults: ListResponse["results"] = [];
    let cursor: string | undefined;

    do {
      const body: Record<string, any> = { page_size: 100 };
      if (query) body.query = query;
      if (filter) body.filter = filter;
      if (sort) body.sort = sort;
      if (cursor) body.start_cursor = cursor;

      const response = await fetch(`${this.baseUrl}/search`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      });

      const page: ListResponse = await response.json();
      allResults.push(...page.results);
      cursor = page.has_more ? (page.next_cursor ?? undefined) : undefined;
    } while (cursor);

    return {
      object: "list",
      results: allResults,
      has_more: false,
      next_cursor: null,
    };
  }

  async toMarkdown(response: NotionResponse): Promise<string> {
    return convertToMarkdown(response);
  }
}
