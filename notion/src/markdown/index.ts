/**
 * Utilities for converting Notion API responses to Markdown
 */
import { NotionResponse, PageResponse, DatabaseResponse, BlockResponse, ListResponse, RichTextItemResponse, PageProperty } from "../types/index.js";

/**
 * Converts Notion API response to Markdown
 * @param response Response from Notion API
 * @returns Markdown formatted string
 */
export function convertToMarkdown(response: NotionResponse): string {
  // Execute appropriate conversion process based on response type
  if (!response) return '';
  
  // Branch processing by object type
  switch (response.object) {
    case 'page':
      return convertPageToMarkdown(response as PageResponse);
    case 'database':
      return convertDatabaseToMarkdown(response as DatabaseResponse);
    case 'block':
      return convertBlockToMarkdown(response as BlockResponse);
    case 'list':
      return convertListToMarkdown(response as ListResponse);
    default:
      // Return JSON string if conversion is not possible
      return `\`\`\`json\n${JSON.stringify(response, null, 2)}\n\`\`\``;
  }
}

/**
 * Converts a Notion page to Markdown
 */
function convertPageToMarkdown(page: PageResponse): string {
  let markdown = '';

  // Extract title (from properties)
  const title = extractPageTitle(page);
  if (title) {
    markdown += `# ${title}\n\n`;
  }

  // Display page properties as a Markdown table
  markdown += convertPropertiesToMarkdown(page.properties);

  // Include additional information if there are child blocks
  markdown += '\n\n> This page contains child blocks. You can retrieve them using `retrieveBlockChildren`.\n';
  markdown += `> Block ID: \`${page.id}\`\n`;

  return markdown;
}

/**
 * Converts a Notion database to Markdown
 */
function convertDatabaseToMarkdown(database: DatabaseResponse): string {
  let markdown = '';

  // Extract database title
  const title = extractRichText(database.title || []);
  if (title) {
    markdown += `# ${title} (Database)\n\n`;
  }

  // Add description if available
  const description = extractRichText(database.description || []);
  if (description) {
    markdown += `${description}\n\n`;
  }

  // Display database property schema
  if (database.properties) {
    markdown += '## Properties\n\n';
    markdown += '| Property Name | Type | Details |\n';
    markdown += '|------------|------|------|\n';

    Object.entries(database.properties).forEach(([key, prop]) => {
      const propName = prop.name || key;
      const propType = prop.type || 'unknown';
      
      // Additional information based on property type
      let details = '';
      switch (propType) {
        case 'select':
        case 'multi_select':
          const options = prop[propType]?.options || [];
          details = `Options: ${options.map((o: any) => o.name).join(', ')}`;
          break;
        case 'relation':
          details = `Related DB: ${prop.relation?.database_id || ''}`;
          break;
        case 'formula':
          details = `Formula: ${prop.formula?.expression || ''}`;
          break;
        case 'rollup':
          details = `Rollup: ${prop.rollup?.function || ''}`;
          break;
        case 'created_by':
        case 'last_edited_by':
          details = 'User reference';
          break;
        case 'created_time':
        case 'last_edited_time':
          details = 'Timestamp';
          break;
        case 'date':
          details = 'Date or date range';
          break;
        case 'email':
          details = 'Email address';
          break;
        case 'files':
          details = 'File attachments';
          break;
        case 'number':
          details = `Format: ${prop.number?.format || 'plain number'}`;
          break;
        case 'people':
          details = 'People reference';
          break;
        case 'phone_number':
          details = 'Phone number';
          break;
        case 'rich_text':
          details = 'Formatted text';
          break;
        case 'status':
          const statusOptions = prop.status?.options || [];
          details = `Options: ${statusOptions.map((o: any) => o.name).join(', ')}`;
          break;
        case 'title':
          details = 'Database title';
          break;
        case 'url':
          details = 'URL link';
          break;
        case 'checkbox':
          details = 'Boolean value';
          break;
      }
      
      markdown += `| ${escapeTableCell(propName)} | ${propType} | ${escapeTableCell(details)} |\n`;
    });
    
    markdown += '\n';
  }

  return markdown;
}

/**
 * Converts Notion API block response to Markdown
 */
function convertBlockToMarkdown(block: BlockResponse): string {
  if (!block) return '';

  // Convert based on block type
  return renderBlock(block);
}

/**
 * Converts list response (search results or block children) to Markdown
 */
function convertListToMarkdown(list: ListResponse): string {
  if (!list || !list.results || !Array.isArray(list.results)) {
    return '```\nNo results\n```';
  }

  let markdown = '';
  
  // Determine the type of results
  const firstResult = list.results[0];
  const resultType = firstResult?.object || 'unknown';
  
  // Add header based on type
  switch (resultType) {
    case 'page':
      markdown += '# Search Results (Pages)\n\n';
      break;
    case 'database':
      markdown += '# Search Results (Databases)\n\n';
      break;
    case 'block':
      markdown += '# Block Contents\n\n';
      break;
    default:
      markdown += '# Results List\n\n';
  }

  // Process each result
  for (const item of list.results) {
    // Convert based on type
    switch (item.object) {
      case 'page':
        if (resultType === 'page') {
          // Display page title and link
          const title = extractPageTitle(item as PageResponse) || 'Untitled';
          markdown += `## [${title}](${(item as PageResponse).url || '#'})\n\n`;
          markdown += `ID: \`${item.id}\`\n\n`;
          // Separator line
          markdown += '---\n\n';
        } else {
          // Full conversion
          markdown += convertPageToMarkdown(item as PageResponse);
          markdown += '\n\n---\n\n';
        }
        break;
        
      case 'database':
        if (resultType === 'database') {
          // Simple display
          const dbTitle = extractRichText((item as DatabaseResponse).title || []) || 'Untitled Database';
          markdown += `## [${dbTitle}](${(item as DatabaseResponse).url || '#'})\n\n`;
          markdown += `ID: \`${item.id}\`\n\n`;
          markdown += '---\n\n';
        } else {
          // Full conversion
          markdown += convertDatabaseToMarkdown(item as DatabaseResponse);
          markdown += '\n\n---\n\n';
        }
        break;
        
      case 'block':
        markdown += renderBlock(item as BlockResponse);
        markdown += '\n\n';
        break;
        
      default:
        markdown += `\`\`\`json\n${JSON.stringify(item, null, 2)}\n\`\`\`\n\n`;
    }
  }

  // Include pagination info if available
  if (list.has_more) {
    markdown += '\n> More results available. Use `start_cursor` parameter with the next request.\n';
    if (list.next_cursor) {
      markdown += `> Next cursor: \`${list.next_cursor}\`\n`;
    }
  }

  return markdown;
}

/**
 * Extracts page title
 */
function extractPageTitle(page: PageResponse): string {
  if (!page || !page.properties) return '';
  
  // Look for the title property
  for (const [_, prop] of Object.entries(page.properties)) {
    const property = prop as PageProperty;
    if (property.type === 'title' && Array.isArray(property.title)) {
      return extractRichText(property.title);
    }
  }
  
  return '';
}

/**
 * Converts page properties to Markdown
 */
function convertPropertiesToMarkdown(properties: Record<string, PageProperty>): string {
  if (!properties) return '';
  
  let markdown = '## Properties\n\n';
  
  // Display properties as a key-value table
  markdown += '| Property | Value |\n';
  markdown += '|------------|----|\n';
  
  for (const [key, prop] of Object.entries(properties)) {
    const property = prop as PageProperty;
    const propName = key;
    let propValue = '';
    
    // Extract value based on property type
    switch (property.type) {
      case 'title':
        propValue = extractRichText(property.title || []);
        break;
      case 'rich_text':
        propValue = extractRichText(property.rich_text || []);
        break;
      case 'number':
        propValue = property.number?.toString() || '';
        break;
      case 'select':
        propValue = property.select?.name || '';
        break;
      case 'multi_select':
        propValue = (property.multi_select || [])
          .map((item: any) => item.name)
          .join(', ');
        break;
      case 'date':
        const start = property.date?.start || '';
        const end = property.date?.end ? ` → ${property.date.end}` : '';
        propValue = start + end;
        break;
      case 'people':
        propValue = (property.people || [])
          .map((person: any) => person.name || person.id)
          .join(', ');
        break;
      case 'files':
        propValue = (property.files || [])
          .map((file: any) => `[${file.name || 'Attachment'}](${file.file?.url || file.external?.url || '#'})`)
          .join(', ');
        break;
      case 'checkbox':
        propValue = property.checkbox ? '✓' : '✗';
        break;
      case 'url':
        propValue = property.url || '';
        break;
      case 'email':
        propValue = property.email || '';
        break;
      case 'phone_number':
        propValue = property.phone_number || '';
        break;
      case 'formula':
        propValue = property.formula?.string || 
                   property.formula?.number?.toString() || 
                   property.formula?.boolean?.toString() || '';
        break;
      case 'status':
        propValue = property.status?.name || '';
        break;
      case 'relation':
        propValue = (property.relation || [])
          .map((relation: any) => `\`${relation.id}\``)
          .join(', ');
        break;
      case 'rollup':
        if (property.rollup?.type === 'array') {
          propValue = JSON.stringify(property.rollup.array || []);
        } else {
          propValue = property.rollup?.number?.toString() || 
                     property.rollup?.date?.start || 
                     property.rollup?.string || '';
        }
        break;
      case 'created_by':
        propValue = property.created_by?.name || property.created_by?.id || '';
        break;
      case 'created_time':
        propValue = property.created_time || '';
        break;
      case 'last_edited_by':
        propValue = property.last_edited_by?.name || property.last_edited_by?.id || '';
        break;
      case 'last_edited_time':
        propValue = property.last_edited_time || '';
        break;
      default:
        propValue = '(Unsupported property type)';
    }
    
    markdown += `| ${escapeTableCell(propName)} | ${escapeTableCell(propValue)} |\n`;
  }
  
  return markdown;
}

/**
 * Extracts plain text from a Notion rich text array
 */
function extractRichText(richTextArray: RichTextItemResponse[]): string {
  if (!richTextArray || !Array.isArray(richTextArray)) return '';
  
  return richTextArray
    .map(item => {
      let text = item.plain_text || '';
      
      // Process annotations
      if (item.annotations) {
        const { bold, italic, strikethrough, code } = item.annotations;
        
        if (code) text = `\`${text}\``;
        if (bold) text = `**${text}**`;
        if (italic) text = `*${text}*`;
        if (strikethrough) text = `~~${text}~~`;
      }
      
      // Process links
      if (item.href) {
        text = `[${text}](${item.href})`;
      }
      
      return text;
    })
    .join('');
}

/**
 * Converts a block to Markdown
 */
function renderBlock(block: BlockResponse): string {
  if (!block) return '';
  
  const blockType = block.type;
  if (!blockType) return '';
  
  // Get block content
  const blockContent = block[blockType];
  if (!blockContent && blockType !== 'divider') return '';

  switch (blockType) {
    case 'paragraph':
      return renderParagraph(blockContent);
      
    case 'heading_1':
      return `# ${extractRichText(blockContent.rich_text || [])}`;
      
    case 'heading_2':
      return `## ${extractRichText(blockContent.rich_text || [])}`;
      
    case 'heading_3':
      return `### ${extractRichText(blockContent.rich_text || [])}`;
      
    case 'bulleted_list_item':
      return `- ${extractRichText(blockContent.rich_text || [])}`;
      
    case 'numbered_list_item':
      return `1. ${extractRichText(blockContent.rich_text || [])}`;
      
    case 'to_do':
      const checked = blockContent.checked ? 'x' : ' ';
      return `- [${checked}] ${extractRichText(blockContent.rich_text || [])}`;
      
    case 'toggle':
      return `<details>\n<summary>${extractRichText(blockContent.rich_text || [])}</summary>\n\n*Additional API request is needed to display child blocks*\n\n</details>`;
      
    case 'child_page':
      return `📄 **Child Page**: ${blockContent.title || 'Untitled'}`;
      
    case 'image':
      const imageType = blockContent.type || '';
      const imageUrl = imageType === 'external' 
        ? blockContent.external?.url 
        : blockContent.file?.url;
      const imageCaption = extractRichText(blockContent.caption || []) || 'image';
      return `![${imageCaption}](${imageUrl || '#'})`;
      
    case 'divider':
      return '---';
      
    case 'quote':
      return `> ${extractRichText(blockContent.rich_text || [])}`;
      
    case 'code':
      const codeLanguage = blockContent.language || 'plaintext';
      const codeContent = extractRichText(blockContent.rich_text || []);
      return `\`\`\`${codeLanguage}\n${codeContent}\n\`\`\``;
      
    case 'callout':
      const calloutIcon = blockContent.icon?.emoji || '';
      const calloutText = extractRichText(blockContent.rich_text || []);
      return `> ${calloutIcon} ${calloutText}`;
      
    case 'bookmark':
      const bookmarkUrl = blockContent.url || '';
      const bookmarkCaption = extractRichText(blockContent.caption || []) || bookmarkUrl;
      return `[${bookmarkCaption}](${bookmarkUrl})`;
      
    case 'table':
      return `*Table data (${blockContent.table_width || 0} columns) - Additional API request is needed to display details*`;
      
    case 'child_database':
      return `📊 **Embedded Database**: \`${block.id}\``;
      
    default:
      return `*Unsupported block type: ${blockType}*`;
  }
}

/**
 * Renders a paragraph block
 */
function renderParagraph(paragraph: any): string {
  if (!paragraph || !paragraph.rich_text) return '';
  
  return extractRichText(paragraph.rich_text);
}

/**
 * Escapes characters that need special handling in Markdown table cells
 */
function escapeTableCell(text: string): string {
  if (!text) return '';
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ').replace(/\+/g, '\\+');
} 