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

// Helper to convert Markdown-ish text to Portable Text blocks
// Note: This is a simplified version for common blog structures
function textToBlocks(text) {
  const blocks = [];
  const lines = text.split("\n");
  let currentList = null;

  for (let line of lines) {
    line = line.trim();
    if (!line || line === "---") continue;

    // Headings
    if (line.startsWith("### ")) {
      blocks.push({
        _type: "block",
        style: "h3",
        children: [{ _type: "span", text: line.replace("### ", "") }]
      });
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({
        _type: "block",
        style: "h2",
        children: [{ _type: "span", text: line.replace("## ", "") }]
      });
      continue;
    }

    // Bullet points
    if (line.startsWith("* ") || line.startsWith("- ")) {
      blocks.push({
        _type: "block",
        style: "normal",
        listItem: "bullet",
        children: [{ _type: "span", text: line.substring(2) }]
      });
      continue;
    }

    // Strong text (simplified)
    const strongRegex = /\*\*(.*?)\*\*/g;
    let children = [];
    let lastIndex = 0;
    let match;
    while ((match = strongRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        children.push({ _type: "span", text: line.substring(lastIndex, match.index) });
      }
      children.push({ _type: "span", text: match[1], marks: ["strong"] });
      lastIndex = strongRegex.lastIndex;
    }
    if (lastIndex < line.length) {
      children.push({ _type: "span", text: line.substring(lastIndex) });
    }

    if (children.length === 0) {
      children = [{ _type: "span", text: line }];
    }

    blocks.push({
      _type: "block",
      style: "normal",
      children
    });
  }
  return blocks;
}

const enBodyRaw = `In the world of 8×8 draughts, technical precision is the bridge between a casual game and a professional sport. For years, players of **Tanzania Draughts (TZD)**—a unique and vibrant 8×8 variant—have faced a significant hurdle: the lack of dedicated analysis tools. Most open-source engines are optimized for Russian, Brazilian, or American rules, often overlooking the specific nuances and mandatory capture laws that define the Tanzanian style.

Today, we are proud to introduce **Mkaguzi** (Swahili for "The Inspector"). Mkaguzi is not just another draughts engine; it is the first engine built from the ground up to respect and master the rules of Tanzania Draught builders.

### Why Mkaguzi?

The development of Mkaguzi was born out of necessity. After a thorough search revealed no free, open-source 8×8 engines capable of fully supporting the complexities of TZD, the TzDraft community took the lead. 

Mkaguzi represents a revolution in the Tanzanian draughts ecosystem. By providing a rule-accurate engine, we are opening doors to:
* Professional Training: Players can now analyze their games with an AI that understands their rules.
* Sport Formalization: Moving TZD from a "street game" to a world-standard sport through proper documentation and historical preservation.
* Open Development: Providing a foundation for future projects, mobile apps, and academic study of board games.

### Technical Excellence (v0.1)

Our initial release (v0.1) focused on **correctness and architecture**. Built in C++20 with a high-performance bitboard representation, Mkaguzi offers:
* Rule Fidelity: Complete support for TZD-specific capture logic, including majority-capture rules and promotion restrictions.
* Transparent Evaluation: A unique "Eval Trace" feature that breaks down the engine's thinking into understandable metrics like mobility, structure, and king safety.
* Universal Compatibility: Though built for TZD, the architecture is variant-ready, allowing us to eventually support other African board games.

### The Road Ahead: V0.2 and Beyond

We are just getting started. While v0.1 provides a solid engine core, our roadmap is ambitious. We are actively working on:
* Opening Books (v0.2): To help players master the early game through curated theory.
* Endgame Tablebases (v0.3): Solving positions with 5 pieces or fewer to ensure perfect play in the final stages.
* Intermediate Game Databases: Bridging the gap between the opening and the endgame.

### More Than Just a Game

At **TzDraft**, we believe that board games are more than just entertainment; they are a part of our heritage. We are a community focused on the development of forgotten or informal board games. We see a direct potential to change the living conditions of players by formalizing the sport, creating professional opportunities, and fostering a structured competitive environment.

Mkaguzi is our gift to the Tanzanian draughts community. It is a step toward making TZD a globally recognized and professionally documented sport.`;

const swBodyRaw = `Katika ulimwengu wa mchezo wa drafti wa 8×8, usahihi wa kiufundi ndio daraja kati ya mchezo wa kawaida na michezo ya kiushindani na kitaalamu. Kwa miaka mingi, wachezaji wa **Drafti ya Kitanzania (TZD)**—mchezo wa pekee na wenye msisimko mkubwa—wamekuwa wakikabiliwa na changamoto kubwa: ukosefu wa zana maalum za uchambuzi. Injini nyingi zilizopo zimeundwa kwa ajili ya sheria za Kirusi, Kibrazili, au Kimarekani, na mara nyingi zinapuuza sheria maalum na za kipekee za Drafti ya Kitanzania, hususan sheria za ulaji wa lazima (mandatory capture).

Leo, tunajivunia kutambulisha **Mkaguzi**. Mkaguzi siyo tu injini nyingine ya drafti; ni injini ya kwanza kabisa iliyojengwa tangu mwanzo ili kuheshimu na kufuata sheria za drafti ya Kitanzania kwa usahihi wa asilimia mia moja.

### Kwa Nini Mkaguzi?

Maendeleo ya Mkaguzi yalitokana na uhitaji mkubwa. Baada ya utafiti wa kina kuonyesha kuwa hakuna injini ya 8×8 ya bure na iliyo wazi (open-source) yenye uwezo wa kufuata sheria tata za TZD, jumuiya ya TzDraft ilichukua hatua.

Mkaguzi inawakilisha mapinduzi katika mchezo wa drafti nchini Tanzania. Kwa kutoa injini inayofuata sheria sahihi, tunafungua milango ya:
* Mafunzo ya Kitaalamu: Wachezaji sasa wanaweza kuchambua michezo yao kwa msaada wa AI inayoelewa sheria zao.
* Urasimishaji wa Mchezo: Kuifanya TZD itoke kwenye "michezo ya mtaani" na kuwa mchezo wa kiwango cha kidunia kupitia nyaraka sahihi na uhifadhi wa historia.
* Maendeleo ya Wazi: Kutoa msingi kwa ajili ya miradi ya baadaye, programu za simu, na tafiti za kitaaluma kuhusu michezo ya bodi.

### Ubora wa Kiufundi (v0.1)

Toleo letu la kwanza (v0.1) limelenga zaidi **usahihi na muundo wa mfumo**. Imetengenezwa kwa lugha ya C++20 na teknolojia ya hali ya juu ya "bitboard", Mkaguzi inatoa:
* Umakini wa Sheria: Usaidizi kamili wa mantiki ya ulaji wa TZD, ikiwa ni pamoja na sheria ya ulaji wa kete nyingi zaidi na vizuizi vya kupandisha kete (promotion).
* Uchambuzi wa Wazi: Kipengele cha kipekee cha "Eval Trace" ambacho kinaonyesha jinsi injini inavyofikiri, kuanzia urahisi wa kusonga, muundo wa kete, hadi usalama wa mfalme.
* Uwezo wa Kubadilika: Ingawa imejengwa kwa ajili ya TZD, muundo wake unaruhusu kuongeza sheria za michezo mingine ya bodi ya Kiafrika hapo baadaye.

### Safari Inayoendelea: V0.2 na Zaidi

Huu ni mwanzo tu. Ingawa v0.1 inatoa msingi imara, malengo yetu ni makubwa. Hivi sasa tunafanya kazi kwa bidii kwenye:
* Vitabu vya Mianzo - Opening Books (v0.2): Kusaidia wachezaji kuanza mchezo kwa ufundi zaidi kupitia nadharia zilizofanyiwa utafiti.
* Endgame Tablebases (v0.3): Kutatua nafasi za kete 5 au chini yake ili kuhakikisha uchezaji usio na makosa katika hatua za mwisho za mchezo.
* Kanzi-data za Michezo ya Katikati (Intermediate Game): Kuziba pengo kati ya mwanzo wa mchezo na hatua za mwisho.

### Zaidi ya Mchezo Tu

Katika **TzDraft**, tunaamini kuwa michezo ya bodi ni zaidi ya burudani tu; ni sehemu ya urithi wetu. Sisi ni jumuiya inayolenga kuendeleza michezo ya bodi iliyosahaulika au isiyo rasmi. Tunaona uwezo wa moja kwa moja wa kubadilisha maisha ya wachezaji kwa kurasimisha mchezo, kutengeneza fursa za kitaalamu, na kukuza mazingira ya ushindani yaliyopangwa vizuri.

Mkaguzi ni zawadi yetu kwa jumuiya ya drafti nchini Tanzania. Ni hatua kuelekea kuifanya TZD kuwa mchezo unaotambulika kimataifa na uliorekodiwa kitaalamu.`;

async function publish() {
  try {
    // 1. Upload Hero Image (Banana Version)
    const imagePath = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/9264fbf6-3153-4232-8b27-e2075550b56e/mkaguzi_banana_hero_1776289272409.png");
    const imageAsset = await client.assets.upload("image", fs.createReadStream(imagePath), {
      filename: "mkaguzi_banana_hero.png"
    });
    console.log("Image uploaded:", imageAsset._id);

    // 2. Prepare the article document
    const doc = {
      _type: "article",
      featured: true,
      publishedAt: new Date().toISOString(),
      author: "TzDraft Team",
      category: {
        _type: "reference",
        _ref: "5514d1ab-95ed-42b7-a6c6-1da16bbb185b" // Social Impact
      },
      slug: {
        _type: "slug",
        current: "mkaguzi-tanzania-draughts-engine"
      },
      coverImage: {
        _type: "image",
        asset: {
          _type: "reference",
          _ref: imageAsset._id
        },
        alt: "A futuristic draughts board in a Tanzanian banana grove, representing the Mkaguzi AI engine."
      },
      title: {
        en: "Mkaguzi: The First Dedicated Engine for Tanzania Draughts",
        sw: "Mkaguzi: Injini ya Kwanza Maalum kwa Ajili ya Drafti ya Kitanzania"
      },
      body: {
        en: textToBlocks(enBodyRaw),
        sw: textToBlocks(swBodyRaw)
      },
      description: {
        en: "Meet Mkaguzi, the first draughts engine built specifically for Tanzanian rules. A revolution for professional training and sport formalization.",
        sw: "Kutana na Mkaguzi, injini ya kwanza ya drafti iliyoundwa maalum kwa ajili ya sheria za Kitanzania. Mapinduzi kwa mafunzo ya kitaalamu."
      },
      keywords: {
        en: ["Mkaguzi", "Tanzania Draughts", "AI Engine", "TzDraft", "8x8 Draughts"],
        sw: ["Mkaguzi", "Drafti ya Kitanzania", "Injini ya AI", "TzDraft", "Dama"]
      }
    };

    // 3. Create the document in Sanity
    const result = await client.create(doc);
    console.log("Article published successfully! Document ID:", result._id);
    console.log("Article Slug:", doc.slug.current);

  } catch (error) {
    console.error("Publishing failed:", error);
    process.exit(1);
  }
}

publish();
