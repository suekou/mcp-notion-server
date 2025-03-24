import { expect, test, describe } from "vitest";
import { convertToMarkdown } from "./index.js";
import {
  PageResponse,
  BlockResponse,
  DatabaseResponse,
  ListResponse,
} from "../types/index.js";

describe("convertToMarkdown", () => {
  test("should handle null or undefined response", () => {
    // @ts-ignore - intentionally testing with null
    expect(convertToMarkdown(null)).toBe("");
    // @ts-ignore - intentionally testing with undefined
    expect(convertToMarkdown(undefined)).toBe("");
  });

  test("should convert a page response to markdown", () => {
    // ref: https://developers.notion.com/reference/page
    const pageResponse: PageResponse = {
      object: "page",
      id: "be633bf1-dfa0-436d-b259-571129a590e5",
      created_time: "2022-10-24T22:54:00.000Z",
      last_edited_time: "2023-03-08T18:25:00.000Z",
      created_by: {
        object: "user",
        id: "c2f20311-9e54-4d11-8c79-7398424ae41e",
      },
      last_edited_by: {
        object: "user",
        id: "9188c6a5-7381-452f-b3dc-d4865aa89bdf",
      },
      cover: null,
      icon: {
        type: "emoji",
        emoji: "🐞",
      },
      parent: {
        type: "database_id",
        database_id: "a1d8501e-1ac1-43e9-a6bd-ea9fe6c8822b",
      },
      archived: true,
      in_trash: true,
      properties: {
        "Due date": {
          id: "M%3BBw",
          type: "date",
          date: {
            start: "2023-02-23",
            end: null,
            time_zone: null,
          },
        },
        Status: {
          id: "Z%3ClH",
          type: "status",
          status: {
            id: "86ddb6ec-0627-47f8-800d-b65afd28be13",
            name: "Not started",
            color: "default",
          },
        },
        Title: {
          id: "title",
          type: "title",
          title: [
            {
              type: "text",
              text: {
                content: "Bug bash",
                link: null,
              },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "Bug bash",
              href: null,
            },
          ],
        },
      },
      url: "https://www.notion.so/Bug-bash-be633bf1dfa0436db259571129a590e5",
      public_url:
        "https://jm-testing.notion.site/p1-6df2c07bfc6b4c46815ad205d132e22d",
    };

    const markdown = convertToMarkdown(pageResponse);

    // More detailed verification
    expect(markdown).toMatch(/^# Bug bash\n\n/); // Check if title is correctly processed
    expect(markdown).toMatch(/## Properties\n\n/); // Check if properties section exists
    expect(markdown).toMatch(/\| Property \| Value \|\n\|\-+\|\-+\|/); // Check if property table header is correct
    expect(markdown).toMatch(/\| Due date \| 2023-02-23 \|/); // Check if date property is correctly displayed
    expect(markdown).toMatch(/\| Status \| Not started \|/); // Check if status property is correctly displayed
    expect(markdown).toMatch(/\| Title \| Bug bash \|/); // Check if title property is correctly displayed
    expect(markdown).toMatch(/> This page contains child blocks/); // Check if note about child blocks exists
    expect(markdown).toMatch(
      /> Block ID: `be633bf1-dfa0-436d-b259-571129a590e5`/
    ); // Check if block ID is correctly displayed
    expect(markdown).toMatch(
      /\[View in Notion\]\(https:\/\/www\.notion\.so\/Bug-bash-be633bf1dfa0436db259571129a590e5\)/
    ); // Check if link to Notion is correctly displayed
  });

  test("should convert a block response to markdown", () => {
    // ref: https://developers.notion.com/reference/block
    const blockResponse: BlockResponse = {
      object: "block",
      id: "c02fc1d3-db8b-45c5-a222-27595b15aea7",
      parent: {
        type: "page_id",
        page_id: "59833787-2cf9-4fdf-8782-e53db20768a5",
      },
      created_time: "2022-03-01T19:05:00.000Z",
      last_edited_time: "2022-07-06T19:41:00.000Z",
      created_by: {
        object: "user",
        id: "ee5f0f84-409a-440f-983a-a5315961c6e4",
      },
      last_edited_by: {
        object: "user",
        id: "ee5f0f84-409a-440f-983a-a5315961c6e4",
      },
      has_children: false,
      archived: false,
      in_trash: false,
      type: "heading_2",
      heading_2: {
        rich_text: [
          {
            type: "text",
            text: {
              content: "Lacinato kale",
              link: null,
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "green",
            },
            plain_text: "Lacinato kale",
            href: null,
          },
        ],
        color: "default",
        is_toggleable: false,
      },
    };

    const markdown = convertToMarkdown(blockResponse);

    // Check if it's correctly displayed as a heading 2
    expect(markdown).toBe("## Lacinato kale");
  });

  test("should convert a database response to markdown", () => {
    // ref: https://developers.notion.com/reference/create-a-database response 200 - Result
    const databaseResponse: DatabaseResponse = {
      object: "database",
      id: "bc1211ca-e3f1-4939-ae34-5260b16f627c",
      created_time: "2021-07-08T23:50:00.000Z",
      last_edited_time: "2021-07-08T23:50:00.000Z",
      icon: {
        type: "emoji",
        emoji: "🎉",
      },
      cover: {
        type: "external",
        external: {
          url: "https://website.domain/images/image.png",
        },
      },
      url: "https://www.notion.so/bc1211cae3f14939ae34260b16f627c",
      title: [
        {
          type: "text",
          text: {
            content: "Grocery List",
            link: null,
          },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default",
          },
          plain_text: "Grocery List",
          href: null,
        },
      ],
      properties: {
        "+1": {
          id: "Wp%3DC",
          name: "+1",
          type: "people",
          people: {},
        },
        "In stock": {
          id: "fk%5EY",
          name: "In stock",
          type: "checkbox",
          checkbox: {},
        },
        Price: {
          id: "evWq",
          name: "Price",
          type: "number",
          number: {
            format: "dollar",
          },
        },
        Description: {
          id: "V}lX",
          name: "Description",
          type: "rich_text",
          rich_text: {},
        },
        "Last ordered": {
          id: "eVnV",
          name: "Last ordered",
          type: "date",
          date: {},
        },
        Meals: {
          id: "%7DWA~",
          name: "Meals",
          type: "relation",
          relation: {
            database_id: "668d797c-76fa-4934-9b05-ad288df2d136",
            synced_property_name: "Related to Grocery List (Meals)",
          },
        },
        "Number of meals": {
          id: "Z\\Eh",
          name: "Number of meals",
          type: "rollup",
          rollup: {
            rollup_property_name: "Name",
            relation_property_name: "Meals",
            rollup_property_id: "title",
            relation_property_id: "mxp^",
            function: "count",
          },
        },
        "Store availability": {
          id: "s}Kq",
          name: "Store availability",
          type: "multi_select",
          multi_select: {
            options: [
              {
                id: "cb79b393-d1c1-4528-b517-c450859de766",
                name: "Duc Loi Market",
                color: "blue",
              },
              {
                id: "58aae162-75d4-403b-a793-3bc7308e4cd2",
                name: "Rainbow Grocery",
                color: "gray",
              },
              {
                id: "22d0f199-babc-44ff-bd80-a9eae3e3fcbf",
                name: "Nijiya Market",
                color: "purple",
              },
              {
                id: "0d069987-ffb0-4347-bde2-8e4068003dbc",
                name: "Gus's Community Market",
                color: "yellow",
              },
            ],
          },
        },
        Photo: {
          id: "yfiK",
          name: "Photo",
          type: "files",
          files: {},
        },
        "Food group": {
          id: "CM%3EH",
          name: "Food group",
          type: "select",
          select: {
            options: [
              {
                id: "6d4523fa-88cb-4ffd-9364-1e39d0f4e566",
                name: "🥦Vegetable",
                color: "green",
              },
              {
                id: "268d7e75-de8f-4c4b-8b9d-de0f97021833",
                name: "🍎Fruit",
                color: "red",
              },
              {
                id: "1b234a00-dc97-489c-b987-829264cfdfef",
                name: "💪Protein",
                color: "yellow",
              },
            ],
          },
        },
        Name: {
          id: "title",
          name: "Name",
          type: "title",
          title: {},
        },
      },
      parent: {
        type: "page_id",
        page_id: "98ad959b-2b6a-4774-80ee-00246fb0ea9b",
      },
      archived: false,
      is_inline: false,
    };

    const markdown = convertToMarkdown(databaseResponse);

    // More detailed verification
    expect(markdown).toMatch(/^# Grocery List \(Database\)\n\n/); // Check if title is correctly processed
    expect(markdown).toMatch(/## Properties\n\n/); // Check if properties section exists
    expect(markdown).toMatch(
      /\| Property Name \| Type \| Details \|\n\|\-+\|\-+\|\-+\|/
    ); // Check if property table is correct

    // Check if each property is correctly displayed
    expect(markdown).toMatch(/\| \\\+1 \| people \| /); // +1 property
    expect(markdown).toMatch(/\| In stock \| checkbox \| /); // In stock property
    expect(markdown).toMatch(/\| Price \| number \| /); // Price property
    expect(markdown).toMatch(
      /\| Store availability \| multi_select \| Options: Duc Loi Market, Rainbow Grocery, Nijiya Market, Gus's Community Market \|/
    ); // Property with options
    expect(markdown).toMatch(
      /\| Food group \| select \| Options: 🥦Vegetable, 🍎Fruit, 💪Protein \|/
    ); // Options with emoji
    expect(markdown).toMatch(
      /\| Meals \| relation \| Related DB: 668d797c-76fa-4934-9b05-ad288df2d136 \|/
    ); // Relation

    // Check if link to Notion is correctly displayed
    expect(markdown).toMatch(
      /\[View in Notion\]\(https:\/\/www\.notion\.so\/bc1211cae3f14939ae34260b16f627c\)/
    );
  });

  test("should convert a list response to markdown", () => {
    // ref: https://developers.notion.com/reference/post-search response 200 - Result
    const listResponse: ListResponse = {
      object: "list",
      results: [
        {
          object: "page",
          id: "954b67f9-3f87-41db-8874-23b92bbd31ee",
          created_time: "2022-07-06T19:30:00.000Z",
          last_edited_time: "2022-07-06T19:30:00.000Z",
          created_by: {
            object: "user",
            id: "ee5f0f84-409a-440f-983a-a5315961c6e4",
          },
          last_edited_by: {
            object: "user",
            id: "ee5f0f84-409a-440f-983a-a5315961c6e4",
          },
          cover: {
            type: "external",
            external: {
              url: "https://upload.wikimedia.org/wikipedia/commons/6/62/Tuscankale.jpg",
            },
          },
          icon: {
            type: "emoji",
            emoji: "🥬",
          },
          parent: {
            type: "database_id",
            database_id: "d9824bdc-8445-4327-be8b-5b47500af6ce",
          },
          archived: false,
          properties: {
            "Store availability": {
              id: "%3AUPp",
              type: "multi_select",
              multi_select: [],
            },
            "Food group": {
              id: "A%40Hk",
              type: "select",
              select: {
                id: "5e8e7e8f-432e-4d8a-8166-1821e10225fc",
                name: "🥬 Vegetable",
                color: "pink",
              },
            },
            Price: {
              id: "BJXS",
              type: "number",
              number: null,
            },
            "Responsible Person": {
              id: "Iowm",
              type: "people",
              people: [],
            },
            "Last ordered": {
              id: "Jsfb",
              type: "date",
              date: null,
            },
            "Cost of next trip": {
              id: "WOd%3B",
              type: "formula",
              formula: {
                type: "number",
                number: null,
              },
            },
            Recipes: {
              id: "YfIu",
              type: "relation",
              relation: [],
            },
            Description: {
              id: "_Tc_",
              type: "rich_text",
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: "A dark green leafy vegetable",
                    link: null,
                  },
                  annotations: {
                    bold: false,
                    italic: false,
                    strikethrough: false,
                    underline: false,
                    code: false,
                    color: "default",
                  },
                  plain_text: "A dark green leafy vegetable",
                  href: null,
                },
              ],
            },
            "In stock": {
              id: "%60%5Bq%3F",
              type: "checkbox",
              checkbox: false,
            },
            "Number of meals": {
              id: "zag~",
              type: "rollup",
              rollup: {
                type: "number",
                number: 0,
                function: "count",
              },
            },
            Photo: {
              id: "%7DF_L",
              type: "url",
              url: null,
            },
            Name: {
              id: "title",
              type: "title",
              title: [
                {
                  type: "text",
                  text: {
                    content: "Tuscan kale",
                    link: null,
                  },
                  annotations: {
                    bold: false,
                    italic: false,
                    strikethrough: false,
                    underline: false,
                    code: false,
                    color: "default",
                  },
                  plain_text: "Tuscan kale",
                  href: null,
                },
              ],
            },
          },
          url: "https://www.notion.so/Tuscan-kale-954b67f93f8741db887423b92bbd31ee",
        },
        {
          object: "page",
          id: "59833787-2cf9-4fdf-8782-e53db20768a5",
          created_time: "2022-03-01T19:05:00.000Z",
          last_edited_time: "2022-07-06T20:25:00.000Z",
          created_by: {
            object: "user",
            id: "ee5f0f84-409a-440f-983a-a5315961c6e4",
          },
          last_edited_by: {
            object: "user",
            id: "0c3e9826-b8f7-4f73-927d-2caaf86f1103",
          },
          cover: {
            type: "external",
            external: {
              url: "https://upload.wikimedia.org/wikipedia/commons/6/62/Tuscankale.jpg",
            },
          },
          icon: {
            type: "emoji",
            emoji: "🥬",
          },
          parent: {
            type: "database_id",
            database_id: "d9824bdc-8445-4327-be8b-5b47500af6ce",
          },
          archived: false,
          properties: {
            "Store availability": {
              id: "%3AUPp",
              type: "multi_select",
              multi_select: [
                {
                  id: "t|O@",
                  name: "Gus's Community Market",
                  color: "yellow",
                },
                {
                  id: "{Ml\\",
                  name: "Rainbow Grocery",
                  color: "gray",
                },
              ],
            },
            "Food group": {
              id: "A%40Hk",
              type: "select",
              select: {
                id: "5e8e7e8f-432e-4d8a-8166-1821e10225fc",
                name: "🥬 Vegetable",
                color: "pink",
              },
            },
            Price: {
              id: "BJXS",
              type: "number",
              number: 2.5,
            },
            "Responsible Person": {
              id: "Iowm",
              type: "people",
              people: [
                {
                  object: "user",
                  id: "cbfe3c6e-71cf-4cd3-b6e7-02f38f371bcc",
                  name: "Cristina Cordova",
                  avatar_url:
                    "https://lh6.googleusercontent.com/-rapvfCoTq5A/AAAAAAAAAAI/AAAAAAAAAAA/AKF05nDKmmUpkpFvWNBzvu9rnZEy7cbl8Q/photo.jpg",
                  type: "person",
                  person: {
                    email: "cristina@makenotion.com",
                  },
                },
              ],
            },
            "Last ordered": {
              id: "Jsfb",
              type: "date",
              date: {
                start: "2022-02-22",
                end: null,
                time_zone: null,
              },
            },
            "Cost of next trip": {
              id: "WOd%3B",
              type: "formula",
              formula: {
                type: "number",
                number: 0,
              },
            },
            Recipes: {
              id: "YfIu",
              type: "relation",
              relation: [
                {
                  id: "90eeeed8-2cdd-4af4-9cc1-3d24aff5f63c",
                },
                {
                  id: "a2da43ee-d43c-4285-8ae2-6d811f12629a",
                },
              ],
              has_more: false,
            },
            Description: {
              id: "_Tc_",
              type: "rich_text",
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: "A dark ",
                    link: null,
                  },
                  annotations: {
                    bold: false,
                    italic: false,
                    strikethrough: false,
                    underline: false,
                    code: false,
                    color: "default",
                  },
                  plain_text: "A dark ",
                  href: null,
                },
                {
                  type: "text",
                  text: {
                    content: "green",
                    link: null,
                  },
                  annotations: {
                    bold: false,
                    italic: false,
                    strikethrough: false,
                    underline: false,
                    code: false,
                    color: "green",
                  },
                  plain_text: "green",
                  href: null,
                },
                {
                  type: "text",
                  text: {
                    content: " leafy vegetable",
                    link: null,
                  },
                  annotations: {
                    bold: false,
                    italic: false,
                    strikethrough: false,
                    underline: false,
                    code: false,
                    color: "default",
                  },
                  plain_text: " leafy vegetable",
                  href: null,
                },
              ],
            },
            "In stock": {
              id: "%60%5Bq%3F",
              type: "checkbox",
              checkbox: true,
            },
            "Number of meals": {
              id: "zag~",
              type: "rollup",
              rollup: {
                type: "number",
                number: 2,
                function: "count",
              },
            },
            Photo: {
              id: "%7DF_L",
              type: "url",
              url: "https://i.insider.com/612fb23c9ef1e50018f93198?width=1136&format=jpeg",
            },
            Name: {
              id: "title",
              type: "title",
              title: [
                {
                  type: "text",
                  text: {
                    content: "Tuscan kale",
                    link: null,
                  },
                  annotations: {
                    bold: false,
                    italic: false,
                    strikethrough: false,
                    underline: false,
                    code: false,
                    color: "default",
                  },
                  plain_text: "Tuscan kale",
                  href: null,
                },
              ],
            },
          },
          url: "https://www.notion.so/Tuscan-kale-598337872cf94fdf8782e53db20768a5",
        },
      ],
      next_cursor: null,
      has_more: false,
      type: "page_or_database",
      page_or_database: {},
    };

    const markdown = convertToMarkdown(listResponse);

    // More detailed verification
    expect(markdown).toMatch(/^# Search Results \(Pages\)\n\n/); // Check if header is correct

    // Check if title and link for each page in the search results are included
    expect(markdown).toMatch(
      /## \[Tuscan kale\]\(https:\/\/www\.notion\.so\/Tuscan-kale-954b67f93f8741db887423b92bbd31ee\)/
    ); // First page
    expect(markdown).toMatch(/ID: `954b67f9-3f87-41db-8874-23b92bbd31ee`/); // First page ID

    expect(markdown).toMatch(
      /## \[Tuscan kale\]\(https:\/\/www\.notion\.so\/Tuscan-kale-598337872cf94fdf8782e53db20768a5\)/
    ); // Second page
    expect(markdown).toMatch(/ID: `59833787-2cf9-4fdf-8782-e53db20768a5`/); // Second page ID

    // Check if each result is separated by a divider line
    expect(markdown).toMatch(/---\n\n/);

    // Check that pagination info is not present (because has_more is false)
    expect(markdown).not.toMatch(/More results available/);
  });

  test("should convert unknown object type to JSON", () => {
    const unknownResponse = {
      object: "unknown",
      id: "unknown123",
    };

    // @ts-ignore - intentionally testing with unknown type
    const markdown = convertToMarkdown(unknownResponse);

    expect(markdown).toMatch(/^```json\n/); // JSON code block start
    expect(markdown).toMatch(/"object": "unknown"/); // Object type
    expect(markdown).toMatch(/"id": "unknown123"/); // ID
    expect(markdown).toMatch(/\n```$/); // JSON code block end
  });
});
