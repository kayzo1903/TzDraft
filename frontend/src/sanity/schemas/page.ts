import { defineField, defineType } from "sanity";

export const pageSchema = defineType({
  name: "page",
  title: "Static Page / Ukurasa",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "object",
      fields: [
        { name: "en", title: "English", type: "string" },
        { name: "sw", title: "Swahili", type: "string" },
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title.en" },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "lastUpdated",
      title: "Last Updated Text",
      type: "object",
      fields: [
        { name: "en", title: "English (e.g. Last Updated: Feb 2026)", type: "string" },
        { name: "sw", title: "Swahili (e.g. Imesasisishwa: Feb 2026)", type: "string" },
      ],
    }),
    defineField({
      name: "sections",
      title: "Sections",
      type: "array",
      of: [
        {
          type: "object",
          name: "section",
          fields: [
            {
              name: "title",
              title: "Section Title",
              type: "object",
              fields: [
                { name: "en", title: "English", type: "string" },
                { name: "sw", title: "Swahili", type: "string" },
              ],
            },
            {
              name: "content",
              title: "Content Items",
              type: "array",
              of: [{ type: "string" }],
              description: "Use this for list-based sections (like current Rules/Policy)",
            },
            {
              name: "body",
              title: "Rich Body (Optional)",
              type: "object",
              fields: [
                { name: "en", title: "English", type: "blockContent" },
                { name: "sw", title: "Swahili", type: "blockContent" },
              ],
              description: "Use this for narrative sections instead of lists",
            },
            // Subsections for Movement (Men/Kings)
            {
              name: "subsections",
              title: "Sub-sections (Optional)",
              type: "array",
              of: [
                {
                  type: "object",
                  fields: [
                    { name: "title", type: "object", fields: [{name:"en", type:"string"}, {name:"sw", type:"string"}] },
                    { name: "content", type: "array", of: [{type:"string"}] }
                  ]
                }
              ]
            }
          ],
        },
      ],
    }),
  ],
});
