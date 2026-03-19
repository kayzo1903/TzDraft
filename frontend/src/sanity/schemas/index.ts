import { blockContent } from "./blockContent";
import { categorySchema } from "./category";
import { articleSchema } from "./article";

export const schema = {
  types: [
    // Reusable types first (referenced by documents)
    blockContent,
    categorySchema,
    // Documents
    articleSchema,
  ],
};
