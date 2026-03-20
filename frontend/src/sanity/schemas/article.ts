import { defineField, defineType } from "sanity";

export const articleSchema = defineType({
  name: "article",
  title: "Article / Makala",
  type: "document",
  groups: [
    { name: "content",  title: "Content",  default: true },
    { name: "seo",      title: "SEO"                     },
    { name: "settings", title: "Settings"                },
  ],
  fields: [
    // ── Settings ──────────────────────────────────────────────────────────
    defineField({
      name: "featured",
      title: "Featured Article",
      type: "boolean",
      description: "Pin to the top of the listing page",
      initialValue: false,
      group: "settings",
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
      group: "settings",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "category",
      title: "Category / Aina",
      type: "reference",
      to: [{ type: "category" }],
      group: "settings",
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "string",
      initialValue: "TzDraft Team",
      group: "settings",
    }),

    // ── Content ───────────────────────────────────────────────────────────
    defineField({
      name: "slug",
      title: "Slug (URL path)",
      type: "slug",
      description: "Auto-generated from English title. Used in the URL: /learn/[slug]",
      options: { source: "title.en", maxLength: 96 },
      validation: (Rule) => Rule.required(),
      group: "content",
    }),
    defineField({
      name: "coverImage",
      title: "Cover Image",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          type: "string",
          title: "Alt text",
          description: "Describe the image for screen readers and SEO",
          validation: (Rule) => Rule.required().warning("Add alt text to improve SEO"),
        }),
      ],
      group: "content",
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "object",
      description: "Article title in both languages",
      fields: [
        {
          name: "sw",
          title: "Swahili",
          type: "string",
          validation: (Rule) => Rule.required().max(80),
        },
        {
          name: "en",
          title: "English",
          type: "string",
          validation: (Rule) => Rule.required().max(80),
        },
      ],
      validation: (Rule) => Rule.required(),
      group: "content",
    }),
    defineField({
      name: "body",
      title: "Body Content",
      type: "object",
      description: "Write the full article in both languages",
      fields: [
        {
          name: "sw",
          title: "Swahili Body",
          type: "blockContent",
        },
        {
          name: "en",
          title: "English Body",
          type: "blockContent",
        },
      ],
      group: "content",
    }),

    // ── SEO ───────────────────────────────────────────────────────────────
    defineField({
      name: "description",
      title: "Meta Description",
      type: "object",
      description: "Shown in Google search results and WhatsApp link previews (150–160 chars)",
      fields: [
        {
          name: "sw",
          title: "Swahili",
          type: "text",
          rows: 3,
          validation: (Rule) =>
            Rule.max(160).warning("Keep meta descriptions under 160 characters"),
        },
        {
          name: "en",
          title: "English",
          type: "text",
          rows: 3,
          validation: (Rule) =>
            Rule.max(160).warning("Keep meta descriptions under 160 characters"),
        },
      ],
      group: "seo",
    }),
    defineField({
      name: "keywords",
      title: "SEO Keywords",
      type: "object",
      description: "Target search keywords — add Swahili ones first, they rank in zero-competition territory",
      fields: [
        {
          name: "sw",
          title: "Swahili Keywords",
          type: "array",
          of: [{ type: "string" }],
          options: { layout: "tags" },
        },
        {
          name: "en",
          title: "English Keywords",
          type: "array",
          of: [{ type: "string" }],
          options: { layout: "tags" },
        },
      ],
      group: "seo",
    }),
  ],

  // ── Studio preview ────────────────────────────────────────────────────────
  preview: {
    select: {
      title:    "title.en",
      subtitle: "title.sw",
      media:    "coverImage",
      featured: "featured",
    },
    prepare({ title, subtitle, media, featured }) {
      return {
        title:    `${featured ? "⭐ " : ""}${title ?? "Untitled"}`,
        subtitle: subtitle ?? "",
        media,
      };
    },
  },

  orderings: [
    {
      title: "Published (newest first)",
      name:  "publishedAtDesc",
      by:    [{ field: "publishedAt", direction: "desc" }],
    },
    {
      title: "Featured first",
      name:  "featuredFirst",
      by:    [
        { field: "featured",    direction: "desc" },
        { field: "publishedAt", direction: "desc" },
      ],
    },
  ],
});
