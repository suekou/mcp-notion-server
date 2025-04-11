/**
 * Common schema definitions for Notion tools
 */

// Common ID description
export const commonIdDescription =
  "It should be a 32-character string (excluding hyphens) formatted as 8-4-4-4-12 with hyphens (-).";

// Format parameter schema
export const formatParameter = {
  type: "string",
  enum: ["json", "markdown"],
  description:
    "Specify the response format. 'json' returns the original data structure, 'markdown' returns a more readable format. Use 'markdown' when the user only needs to read the page and isn't planning to write or modify it. Use 'json' when the user needs to read the page with the intention of writing to or modifying it.",
  default: "markdown",
};

// Rich text object schema
export const richTextObjectSchema = {
  type: "object",
  description: "A rich text object.",
  properties: {
    type: {
      type: "string",
      description:
        "The type of this rich text object. Possible values: text, mention, equation.",
      enum: ["text", "mention", "equation"],
    },
    text: {
      type: "object",
      description:
        "Object containing text content and optional link info. Required if type is 'text'.",
      properties: {
        content: {
          type: "string",
          description: "The actual text content.",
        },
        link: {
          type: "object",
          description: "Optional link object with a 'url' field. Do NOT provide a NULL value, just ignore this field no link.",
          properties: {
            url: {
              type: "string",
              description: "The URL the text links to.",
            },
          },
        },
      },
    },
    mention: {
      type: "object",
      description:
        "Mention object if type is 'mention'. Represents an inline mention of a database, date, link preview, page, template mention, or user.",
      properties: {
        type: {
          type: "string",
          description: "The type of the mention.",
          enum: [
            "database",
            "date",
            "link_preview",
            "page",
            "template_mention",
            "user",
          ],
        },
        database: {
          type: "object",
          description:
            "Database mention object. Contains a database reference with an 'id' field.",
          properties: {
            id: {
              type: "string",
              description:
                "The ID of the mentioned database." + commonIdDescription,
            },
          },
          required: ["id"],
        },
        date: {
          type: "object",
          description:
            "Date mention object, containing a date property value object.",
          properties: {
            start: {
              type: "string",
              description: "An ISO 8601 formatted start date or date-time.",
            },
            end: {
              type: ["string", "null"],
              description:
                "An ISO 8601 formatted end date or date-time, or null if not a range.",
            },
            time_zone: {
              type: ["string", "null"],
              description:
                "Time zone information for start and end. If null, times are in UTC.",
            },
          },
          required: ["start"],
        },
        link_preview: {
          type: "object",
          description:
            "Link Preview mention object, containing a URL for the link preview.",
          properties: {
            url: {
              type: "string",
              description: "The URL for the link preview.",
            },
          },
          required: ["url"],
        },
        page: {
          type: "object",
          description:
            "Page mention object, containing a page reference with an 'id' field.",
          properties: {
            id: {
              type: "string",
              description:
                "The ID of the mentioned page." + commonIdDescription,
            },
          },
          required: ["id"],
        },
        template_mention: {
          type: "object",
          description:
            "Template mention object, can be a template_mention_date or template_mention_user.",
          properties: {
            type: {
              type: "string",
              enum: ["template_mention_date", "template_mention_user"],
              description: "The template mention type.",
            },
            template_mention_date: {
              type: "string",
              enum: ["today", "now"],
              description: "For template_mention_date type, the date keyword.",
            },
            template_mention_user: {
              type: "string",
              enum: ["me"],
              description: "For template_mention_user type, the user keyword.",
            },
          },
        },
        user: {
          type: "object",
          description: "User mention object, contains a user reference.",
          properties: {
            object: {
              type: "string",
              description: "Should be 'user'.",
              enum: ["user"],
            },
            id: {
              type: "string",
              description: "The ID of the user." + commonIdDescription,
            },
          },
          required: ["object", "id"],
        },
      },
      required: ["type"],
      oneOf: [
        { required: ["database"] },
        { required: ["date"] },
        { required: ["link_preview"] },
        { required: ["page"] },
        { required: ["template_mention"] },
        { required: ["user"] },
      ],
    },
    equation: {
      type: "object",
      description:
        "Equation object if type is 'equation'. Represents an inline LaTeX equation.",
      properties: {
        expression: {
          type: "string",
          description: "LaTeX string representing the inline equation.",
        },
      },
      required: ["expression"],
    },
    annotations: {
      type: "object",
      description: "Styling information for the text. By default, give nothing for default text.",
      properties: {
        bold: { type: "boolean" },
        italic: { type: "boolean" },
        strikethrough: { type: "boolean" },
        underline: { type: "boolean" },
        code: { type: "boolean" },
        color: {
          type: "string",
          description: "Color for the text.",
          enum: [
            "default",
            "blue",
            "blue_background",
            "brown",
            "brown_background",
            "gray",
            "gray_background",
            "green",
            "green_background",
            "orange",
            "orange_background",
            "pink",
            "pink_background",
            "purple",
            "purple_background",
            "red",
            "red_background",
            "yellow",
            "yellow_background",
          ],
        },
      },
    },
    href: {
      type: "string",
      description: "The URL of any link or mention in this text, if any. Do NOT provide a NULL value, just ignore this field if there is no link or mention.",
    },
    plain_text: {
      type: "string",
      description: "The plain text without annotations.",
    },
  },
  required: ["type"],
};

// Block object schema
export const blockObjectSchema = {
  type: "object",
  description: "A Notion block object.",
  properties: {
    object: {
      type: "string",
      description: "Should be 'block'.",
      enum: ["block"],
    },
    type: {
      type: "string",
      description:
        "Type of the block. Possible values include 'paragraph', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 'numbered_list_item', 'to_do', 'toggle', 'child_page', 'child_database', 'embed', 'callout', 'quote', 'equation', 'divider', 'table_of_contents', 'column', 'column_list', 'link_preview', 'synced_block', 'template', 'link_to_page', 'audio', 'bookmark', 'breadcrumb', 'code', 'file', 'image', 'pdf', 'video'. Not all types are supported for creation via API.",
    },
    paragraph: {
      type: "object",
      description: "Paragraph block object.",
      properties: {
        rich_text: {
          type: "array",
          description:
            "Array of rich text objects representing the comment content.",
          items: richTextObjectSchema,
        },
        color: {
          type: "string",
          description: "The color of the block.",
          enum: [
            "default",
            "blue",
            "blue_background",
            "brown",
            "brown_background",
            "gray",
            "gray_background",
            "green",
            "green_background",
            "orange",
            "orange_background",
            "pink",
            "pink_background",
            "purple",
            "purple_background",
            "red",
            "red_background",
            "yellow",
            "yellow_background",
          ],
        },
        children: {
          type: "array",
          description: "Nested child blocks.",
          items: {
            type: "object",
            description: "A nested block object.",
          },
        },
      },
    },
    heading_1: {
      type: "object",
      description: "Heading 1 block object.",
      properties: {
        rich_text: {
          type: "array",
          description: "Array of rich text objects representing the heading content.",
          items: richTextObjectSchema,
        },
        color: {
          type: "string",
          description: "The color of the block.",
          enum: [
            "default",
            "blue",
            "blue_background",
            "brown",
            "brown_background",
            "gray",
            "gray_background",
            "green",
            "green_background",
            "orange",
            "orange_background",
            "pink",
            "pink_background",
            "purple",
            "purple_background",
            "red",
            "red_background",
            "yellow",
            "yellow_background",
          ],
        },
        is_toggleable: {
          type: "boolean",
          description: "Whether the heading can be toggled.",
        },
      },
    },
    heading_2: {
      type: "object",
      description: "Heading 2 block object.",
      properties: {
        rich_text: {
          type: "array",
          description: "Array of rich text objects representing the heading content.",
          items: richTextObjectSchema,
        },
        color: {
          type: "string",
          description: "The color of the block.",
          enum: [
            "default",
            "blue",
            "blue_background",
            "brown",
            "brown_background",
            "gray",
            "gray_background",
            "green",
            "green_background",
            "orange",
            "orange_background",
            "pink",
            "pink_background",
            "purple",
            "purple_background",
            "red",
            "red_background",
            "yellow",
            "yellow_background",
          ],
        },
        is_toggleable: {
          type: "boolean",
          description: "Whether the heading can be toggled.",
        },
      },
    },
    heading_3: {
      type: "object",
      description: "Heading 3 block object.",
      properties: {
        rich_text: {
          type: "array",
          description: "Array of rich text objects representing the heading content.",
          items: richTextObjectSchema,
        },
        color: {
          type: "string",
          description: "The color of the block.",
          enum: [
            "default",
            "blue",
            "blue_background",
            "brown",
            "brown_background",
            "gray",
            "gray_background",
            "green",
            "green_background",
            "orange",
            "orange_background",
            "pink",
            "pink_background",
            "purple",
            "purple_background",
            "red",
            "red_background",
            "yellow",
            "yellow_background",
          ],
        },
        is_toggleable: {
          type: "boolean",
          description: "Whether the heading can be toggled.",
        },
      },
    },
    bulleted_list_item: {
      type: "object",
      description: "Bulleted list item block object.",
      properties: {
        rich_text: {
          type: "array",
          description: "Array of rich text objects representing the list item content.",
          items: richTextObjectSchema,
        },
        color: {
          type: "string",
          description: "The color of the block.",
          enum: [
            "default",
            "blue",
            "blue_background",
            "brown",
            "brown_background",
            "gray",
            "gray_background",
            "green",
            "green_background",
            "orange",
            "orange_background",
            "pink",
            "pink_background",
            "purple",
            "purple_background",
            "red",
            "red_background",
            "yellow",
            "yellow_background",
          ],
        },
        children: {
          type: "array",
          description: "Nested child blocks.",
          items: {
            type: "object",
            description: "A nested block object.",
          },
        },
      },
    },
    numbered_list_item: {
      type: "object",
      description: "Numbered list item block object.",
      properties: {
        rich_text: {
          type: "array",
          description: "Array of rich text objects representing the list item content.",
          items: richTextObjectSchema,
        },
        color: {
          type: "string",
          description: "The color of the block.",
          enum: [
            "default",
            "blue",
            "blue_background",
            "brown",
            "brown_background",
            "gray",
            "gray_background",
            "green",
            "green_background",
            "orange",
            "orange_background",
            "pink",
            "pink_background",
            "purple",
            "purple_background",
            "red",
            "red_background",
            "yellow",
            "yellow_background",
          ],
        },
        children: {
          type: "array",
          description: "Nested child blocks.",
          items: {
            type: "object",
            description: "A nested block object.",
          },
        },
      },
    },
    toggle: {
      type: "object",
      description: "Toggle block object.",
      properties: {
        rich_text: {
          type: "array",
          description: "Array of rich text objects representing the toggle content.",
          items: richTextObjectSchema,
        },
        color: {
          type: "string",
          description: "The color of the block.",
          enum: [
            "default",
            "blue",
            "blue_background",
            "brown",
            "brown_background",
            "gray",
            "gray_background",
            "green",
            "green_background",
            "orange",
            "orange_background",
            "pink",
            "pink_background",
            "purple",
            "purple_background",
            "red",
            "red_background",
            "yellow",
            "yellow_background",
          ],
        },
        children: {
          type: "array",
          description: "Nested child blocks that are revealed when the toggle is opened.",
          items: {
            type: "object",
            description: "A nested block object.",
          },
        },
      },
    },
    divider: {
      type: "object",
      description: "Divider block object.",
      properties: {},
    },
  },
  required: ["object", "type"],
};
