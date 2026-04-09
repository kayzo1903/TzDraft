import { blockContent } from "./blockContent";
import { categorySchema } from "./category";
import { articleSchema } from "./article";
import { pageSchema } from "./page";
import { tacticSchema } from "./tactic";

export const schema = {
  types: [
    // Reusable types first (referenced by documents)
    blockContent,
    categorySchema,
    // Documents
    articleSchema,
    pageSchema,
    tacticSchema,
  ],
};
