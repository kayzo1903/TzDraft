import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schema } from "./schemas";

export default defineConfig({
  name: "tzdraft",
  title: "TzDraft CMS",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  basePath: "/studio",
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title("TzDraft Content")
          .items([
            S.listItem()
              .title("⭐ Featured Articles")
              .child(
                S.documentList()
                  .title("Featured Articles")
                  .filter('_type == "article" && featured == true')
              ),
            S.listItem()
              .title("Articles / Makala")
              .child(
                S.documentTypeList("article")
                  .title("All Articles")
                  .defaultOrdering([{ field: "publishedAt", direction: "desc" }])
              ),
            S.divider(),
            S.listItem()
              .title("Categories / Aina")
              .child(S.documentTypeList("category").title("Categories")),
          ]),
    }),
    visionTool(),
  ],
  schema,
});
