import { expect, test, describe, vi, beforeEach } from 'vitest';
import { NotionClientWrapper } from './index.js';
import { PageResponse } from './types/index.js';

vi.mock('./markdown/index.js', () => ({
  convertToMarkdown: vi.fn().mockReturnValue('# Test')
}));

global.fetch = vi.fn();

describe('NotionClientWrapper', () => {
  let wrapper: any;
  
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Create client wrapper with test token
    wrapper = new NotionClientWrapper('test-token');
    
    // Mock fetch to return JSON
    (global.fetch as any).mockImplementation(() => 
      Promise.resolve({
        json: () => Promise.resolve({ success: true })
      })
    );
  });

  test('should initialize with correct headers', () => {
    expect((wrapper as any).headers).toEqual({
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    });
  });

  test('should call appendBlockChildren with correct parameters', async () => {
    const blockId = 'block123';
    const children = [{ type: 'paragraph' }];
    
    await wrapper.appendBlockChildren(blockId, children);
    
    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/blocks/${blockId}/children`,
      {
        method: 'PATCH',
        headers: (wrapper as any).headers,
        body: JSON.stringify({ children }),
      }
    );
  });

  test('should call retrieveBlock with correct parameters', async () => {
    const blockId = 'block123';
    
    await wrapper.retrieveBlock(blockId);
    
    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/blocks/${blockId}`,
      {
        method: 'GET',
        headers: (wrapper as any).headers,
      }
    );
  });

  test('should call retrieveBlockChildren with pagination parameters', async () => {
    const blockId = 'block123';
    const startCursor = 'cursor123';
    const pageSize = 10;
    
    await wrapper.retrieveBlockChildren(blockId, startCursor, pageSize);
    
    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/blocks/${blockId}/children?start_cursor=${startCursor}&page_size=${pageSize}`,
      {
        method: 'GET',
        headers: (wrapper as any).headers,
      }
    );
  });

  test('should call retrievePage with correct parameters', async () => {
    const pageId = 'page123';
    
    await wrapper.retrievePage(pageId);
    
    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/pages/${pageId}`,
      {
        method: 'GET',
        headers: (wrapper as any).headers,
      }
    );
  });

  test('should call updatePageProperties with correct parameters', async () => {
    const pageId = 'page123';
    const properties = { title: { title: [{ text: { content: 'New Title' } }] } };
    
    await wrapper.updatePageProperties(pageId, properties);
    
    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/pages/${pageId}`,
      {
        method: 'PATCH',
        headers: (wrapper as any).headers,
        body: JSON.stringify({ properties }),
      }
    );
  });

  test('should call queryDatabase with correct parameters', async () => {
    const databaseId = 'db123';
    const filter = { property: 'Status', equals: 'Done' };
    const sorts = [{ property: 'Due Date', direction: 'ascending' }];
    
    await wrapper.queryDatabase(databaseId, filter, sorts);
    
    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: 'POST',
        headers: (wrapper as any).headers,
        body: JSON.stringify({ filter, sorts }),
      }
    );
  });

  test('should call search with correct parameters', async () => {
    const query = 'test query';
    const filter = { property: 'object', value: 'page' };
    
    await wrapper.search(query, filter);
    
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.notion.com/v1/search',
      {
        method: 'POST',
        headers: (wrapper as any).headers,
        body: JSON.stringify({ query, filter }),
      }
    );
  });

  test('should call toMarkdown method correctly', async () => {
    const { convertToMarkdown } = await import('./markdown/index.js');
    
    const response: PageResponse = {
        object: 'page',
        id: 'test',
        created_time: '2021-01-01T00:00:00.000Z',
        last_edited_time: '2021-01-01T00:00:00.000Z',
        parent: {
          type: 'workspace'
        },
        properties: {}
      };
    await wrapper.toMarkdown(response);
    
    expect(convertToMarkdown).toHaveBeenCalledWith(response);
  });
}); 