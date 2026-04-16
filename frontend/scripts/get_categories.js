const { createClient } = require("@sanity/client");
const fs = require("fs");
const path = require("path");

const client = createClient({
  projectId: "wvztgicc",
  dataset: "production",
  useCdn: false,
  apiVersion: "2026-03-18",
  token: "sktoZnelQRPE1MF894TKclO6l0UHjr6XjrtfgoH5Jr0jUAh28i5ivTC22xOCGMYAbWmj3t9l2Hl4swzObz2TQcvDk0CcxJKNQaSxJCVWTkv3oW2KmlwNxmrtPUM8PUieNZhxdQ6MC6b1NOY4VFdvtwwDrZHQe6vMYWq0THeAmSS5D91V1qbX"
});

async function getCategories() {
  const categories = await client.fetch(`*[_type == "category"]{_id, title}`);
  console.log("Categories:", JSON.stringify(categories, null, 2));
}

getCategories();
