import { createClient } from '@sanity/client';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from frontend/.env.local
dotenv.config({ path: join(__dirname, '../.env.local') });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'wvztgicc',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2026-03-18',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

const ARTICLE_ID = 'drafti-official-rules';

const getArticle = (imageAssetId?: string) => ({
  _type: 'article',
  _id: ARTICLE_ID,
  featured: true,
  publishedAt: new Date().toISOString(),
  category: {
    _type: 'reference',
    _ref: 'category-official-standards',
  },
  author: 'TzDraft Rules Committee',
  slug: {
    _type: 'slug',
    current: 'official-rules-explained',
  },
  coverImage: imageAssetId ? {
    _type: 'image',
    asset: {
      _type: 'reference',
      _ref: imageAssetId,
    },
    alt: 'Official Tanzania Drafti Rules and Standards Cover',
  } : undefined,
  title: {
    en: 'Basic Official Tournament Rules',
    sw: 'Sheria Zinazoongoza Mashindano ya Drafti',
  },
  description: {
    en: 'The definitive guide to Tanzania Drafti (TZD) official rules and tournament standards.',
    sw: 'Mwongozo rasmi wa sheria za Drafti ya Tanzania (TZD) na viwango vya mashindano.',
  },
  keywords: {
    en: ['Tanzania Drafti Rules', 'TZD Official', 'Knockout Tournament Rules', 'League Standards', 'Board Games Tanzania'],
    sw: ['Sheria za Drafti', 'Drafti Tanzania', 'TZD Standards', 'Sheria za Mtoano', 'Mashindano ya Drafti'],
  },
  body: {
    en: [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: 's1',
            text: 'Welcome to the official rules of TzDraft. These standards are designed to ensure fair play and competitive integrity in all tournament matches.',
          },
        ],
      },
      {
        _type: 'block',
        _key: 'b2',
        style: 'h2',
        children: [{ _type: 'span', text: '1. Match Format' }],
      },
      {
        _type: 'block',
        _key: 'b3',
        style: 'normal',
        children: [{ _type: 'span', text: 'Each league match consists of two (2) games. Players alternate playing as White and Black.' }],
      },
      {
        _type: 'block',
        _key: 'b4',
        style: 'h2',
        children: [{ _type: 'span', text: '2. Scoring System' }],
      },
      {
        _type: 'block',
        _key: 'b5',
        style: 'normal',
        children: [{ _type: 'span', text: 'Match Win: 3 points | Match Draw: 1 point | Match Loss: 0 points.' }],
      },
      {
        _type: 'block',
        _key: 'b6',
        style: 'h2',
        children: [{ _type: 'span', text: '3. Game Styles' }],
      },
      {
        _type: 'block',
        _key: 'b7',
        style: 'normal',
        children: [{ _type: 'span', text: 'Leagues are played in Blitz (3-5m), Rapid (10-15m), or Classic (30m+) formats with standard TZD increments.' }],
      },
      {
        _type: 'block',
        _key: 'b8',
        style: 'h2',
        children: [{ _type: 'span', text: '4. Elimination (Knockout)' }],
      },
      {
        _type: 'block',
        _key: 'b9',
        style: 'normal',
        children: [{ _type: 'span', text: 'In knockout tournaments, a single loss results in disqualification. Ties are resolved via extra games.' }],
      },
      {
        _type: 'block',
        _key: 'b10',
        style: 'h2',
        children: [{ _type: 'span', text: 'Ready to play?' }],
      },
      {
        _type: 'block',
        _key: 'b11',
        style: 'normal',
        markDefs: [
          { _key: 'linkplay', _type: 'link', href: '/play' },
        ],
        children: [
          { _type: 'span', text: 'Test your skills now on the ' },
          { _type: 'span', marks: ['linkplay'], text: 'Play Page' },
          { _type: 'span', text: ' or check your standing in the ' },
        ],
      },
    ],
    sw: [
      {
        _type: 'block',
        _key: 'sb1',
        style: 'normal',
        children: [{ _type: 'span', text: 'Karibu katika sheria rasmi za TzDraft. Viwango hivi vimeundwa kuhakikisha uchezaji wa haki na heshima katika mashindano yote.' }],
      },
      {
        _type: 'block',
        _key: 'sb2',
        style: 'h2',
        children: [{ _type: 'span', text: '1. Mfumo wa Mechi' }],
      },
      {
        _type: 'block',
        _key: 'sb3',
        style: 'normal',
        children: [{ _type: 'span', text: 'Kila mechi ya ligi itakuwa na michezo miwili (2). Wachezaji watabadilishana kuanza (Nyeupe na Nyeusi).' }],
      },
      {
        _type: 'block',
        _key: 'sb4',
        style: 'h2',
        children: [{ _type: 'span', text: '2. Mfumo wa Alama' }],
      },
      {
        _type: 'block',
        _key: 'sb5',
        style: 'normal',
        children: [{ _type: 'span', text: 'Ushindi: Alama 3 | Sare: Alama 1 | Kushindwa: Alama 0.' }],
      },
      {
        _type: 'block',
        _key: 'sb6',
        style: 'h2',
        children: [{ _type: 'span', text: '3. Mitindo ya Muda' }],
      },
      {
        _type: 'block',
        _key: 'sb7',
        style: 'normal',
        children: [{ _type: 'span', text: 'Ligi huchezwa katika mitindo ya Blitz (dakika 3-5), Rapid (dakika 10-15), au Classic (dakika 30+) kulingana na mpangilio rasmi wa TZD.' }],
      },
      {
        _type: 'block',
        _key: 'sb8',
        style: 'h2',
        children: [{ _type: 'span', text: '4. Mfumo wa Mtoano' }],
      },
      {
        _type: 'block',
        _key: 'sb9',
        style: 'normal',
        children: [{ _type: 'span', text: 'Katika mashindano ya mtoano, ukipoteza mechi moja unatolewa. Sare huamuliwa kwa michezo ya ziada.' }],
      },
    ],
  },
});

async function run() {
  console.log('🚀 Starting Sanity Rules Import with Image...');
  
  if (!process.env.SANITY_WRITE_TOKEN) {
    console.error('❌ Error: SANITY_WRITE_TOKEN is missing in .env.local');
    process.exit(1);
  }

  try {
    // 1. Ensure category exists
    await client.createOrReplace({
      _type: 'category',
      _id: 'category-official-standards',
      title: {
        en: 'Official Standards',
        sw: 'Viwango Rasmi',
      },
    });
    console.log('✅ Official Standards category ensured.');

    // 2. Upload Cover Image
    const imagePath = join(__dirname, '../public/images/official-rules-cover.png');
    let imageAssetId: string | undefined;

    if (fs.existsSync(imagePath)) {
      console.log('📸 Uploading cover image...');
      const imageAsset = await client.assets.upload('image', fs.createReadStream(imagePath), {
        filename: 'official-rules-cover.png',
      });
      imageAssetId = imageAsset._id;
      console.log('✅ Image uploaded:', imageAssetId);
    } else {
      console.warn('⚠️ Warning: Cover image not found at', imagePath);
    }

    // 3. Create/Update Article
    const result = await client.createOrReplace(getArticle(imageAssetId));
    console.log('✅ Article created/updated with image:', result._id);
    console.log(`🔗 Slug: /learn/${result.slug.current}`);
  } catch (err: any) {
    console.error('❌ Import failed:', err.message);
    process.exit(1);
  }
}

run();
