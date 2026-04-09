import { defineField, defineType } from "sanity";

export const tacticSchema = defineType({
  name: "tactic",
  title: "Drafti Tactic / Playbook",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Name of Copy / Tactic",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title" },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "object",
      fields: [
        { name: "en", title: "English", type: "text" },
        { name: "sw", title: "Swahili", type: "text" },
      ],
    }),
    defineField({
      name: "difficulty",
      title: "Difficulty",
      type: "string",
      options: {
        list: [
          { title: "Beginner", value: "beginner" },
          { title: "Intermediate", value: "intermediate" },
          { title: "Pro", value: "pro" },
        ],
      },
      initialValue: "intermediate",
    }),
  ],
});
