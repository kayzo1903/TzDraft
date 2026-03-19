import { defineArrayMember, defineType } from "sanity";

/**
 * Reusable Portable Text definition.
 * Used for both the Swahili and English body fields.
 */
export const blockContent = defineType({
  name: "blockContent",
  title: "Block Content",
  type: "array",
  of: [
    // ── Standard paragraph / heading blocks ───────────────────────────────
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Normal",     value: "normal"     },
        { title: "Heading 2",  value: "h2"         },
        { title: "Heading 3",  value: "h3"         },
        { title: "Heading 4",  value: "h4"         },
        { title: "Quote",      value: "blockquote" },
      ],
      lists: [
        { title: "Bullet",   value: "bullet" },
        { title: "Numbered", value: "number" },
      ],
      marks: {
        decorators: [
          { title: "Bold",      value: "strong"    },
          { title: "Italic",    value: "em"        },
          { title: "Underline", value: "underline" },
        ],
        annotations: [
          {
            name: "link",
            type: "object",
            title: "Link",
            fields: [
              {
                name: "href",
                type: "url",
                title: "URL",
                validation: (Rule) =>
                  Rule.uri({ allowRelative: true, scheme: ["https", "http", "mailto"] }),
              },
              {
                name: "blank",
                type: "boolean",
                title: "Open in new tab",
                initialValue: false,
              },
            ],
          },
        ],
      },
    }),

    // ── Inline image ──────────────────────────────────────────────────────
    defineArrayMember({
      type: "image",
      title: "Image",
      options: { hotspot: true },
      fields: [
        {
          name: "alt",
          type: "string",
          title: "Alt text",
          description: "Important for SEO and accessibility",
          validation: (Rule) => Rule.required().warning("Always add alt text"),
        },
        {
          name: "caption",
          type: "string",
          title: "Caption (optional)",
        },
      ],
    }),

    // ── Callout block (Tip / Rule / Warning) ──────────────────────────────
    defineArrayMember({
      type: "object",
      name: "callout",
      title: "Callout",
      fields: [
        {
          name: "type",
          title: "Type",
          type: "string",
          options: {
            list: [
              { title: "💡 Tip",     value: "tip"     },
              { title: "📋 Rule",    value: "rule"    },
              { title: "⚠️ Warning", value: "warning" },
            ],
            layout: "radio",
          },
          initialValue: "tip",
          validation: (Rule) => Rule.required(),
        },
        {
          name: "sw",
          title: "Swahili Text",
          type: "text",
          rows: 3,
        },
        {
          name: "en",
          title: "English Text",
          type: "text",
          rows: 3,
        },
      ],
      preview: {
        select: { type: "type", en: "en", sw: "sw" },
        prepare({ type, en, sw }) {
          const icon = type === "tip" ? "💡" : type === "rule" ? "📋" : "⚠️";
          return { title: `${icon} ${type?.toUpperCase()}`, subtitle: en || sw };
        },
      },
    }),
  ],
});
