import { defineField, defineType } from "sanity";

export const categorySchema = defineType({
  name: "category",
  title: "Category / Aina",
  type: "document",
  fields: [
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title.en", maxLength: 64 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "object",
      fields: [
        { name: "sw", title: "Swahili", type: "string" },
        { name: "en", title: "English", type: "string" },
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "object",
      fields: [
        { name: "sw", title: "Swahili", type: "text", rows: 2 },
        { name: "en", title: "English", type: "text", rows: 2 },
      ],
    }),
  ],
  preview: {
    select: { title: "title.en", subtitle: "title.sw" },
    prepare({ title, subtitle }) {
      return { title, subtitle };
    },
  },
});
