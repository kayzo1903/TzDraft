const { createClient } = require("@sanity/client");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env.local
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "wvztgicc",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  useCdn: false,
  apiVersion: "2026-03-18",
  token: process.env.SANITY_WRITE_TOKEN
});

async function getCategories() {
  const categories = await client.fetch(`*[_type == "category"]{_id, title}`);
  console.log("Categories:", JSON.stringify(categories, null, 2));
}

getCategories();
