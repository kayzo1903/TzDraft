const { createClient } = require("@sanity/client");
const fs = require("fs");
const path = require("path");

const client = createClient({
  projectId: "wvztgicc",
  dataset: "production",
  useCdn: false,
  apiVersion: "2026-03-18",
  token: "REDACTED_REVOKE_AND_REPLACE"
});

async function getCategories() {
  const categories = await client.fetch(`*[_type == "category"]{_id, title}`);
  console.log("Categories:", JSON.stringify(categories, null, 2));
}

getCategories();
