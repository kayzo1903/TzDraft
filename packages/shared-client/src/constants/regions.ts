/**
 * Countries and their regions supported for regional leaderboards.
 * Only countries listed here will show a region dropdown on signup/profile.
 * Add more countries over time without any schema changes.
 */
export const REGIONS_BY_COUNTRY: Record<string, string[]> = {
  TZ: [
    'Arusha',
    'Dar es Salaam',
    'Dodoma',
    'Geita',
    'Iringa',
    'Kagera',
    'Katavi',
    'Kigoma',
    'Kilimanjaro',
    'Lindi',
    'Manyara',
    'Mara',
    'Mbeya',
    'Morogoro',
    'Mtwara',
    'Mwanza',
    'Njombe',
    'Pemba North',
    'Pemba South',
    'Pwani',
    'Rukwa',
    'Ruvuma',
    'Shinyanga',
    'Simiyu',
    'Singida',
    'Songwe',
    'Tabora',
    'Tanga',
    'Zanzibar North',
    'Zanzibar South',
    'Zanzibar West',
  ],
  // Expand later:
  // KE: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', ...],
  // UG: ['Central', 'Eastern', 'Northern', 'Western'],
};

/** True if the country has a defined region list for leaderboards */
export function hasRegions(country: string): boolean {
  return country in REGIONS_BY_COUNTRY;
}

/**
 * Common country list with ISO 3166-1 alpha-2 codes.
 * Tanzania is first for default selection.
 */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: 'TZ', name: 'Tanzania' },
  { code: 'KE', name: 'Kenya' },
  { code: 'UG', name: 'Uganda' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'BI', name: 'Burundi' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' },
  { code: 'EG', name: 'Egypt' },
  { code: 'MA', name: 'Morocco' },
  { code: 'SN', name: 'Senegal' },
  { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'CM', name: 'Cameroon' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'AO', name: 'Angola' },
  { code: 'CD', name: 'DR Congo' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'AU', name: 'Australia' },
  { code: 'IN', name: 'India' },
  { code: 'CN', name: 'China' },
  { code: 'JP', name: 'Japan' },
  { code: 'BR', name: 'Brazil' },
  { code: 'OTHER', name: 'Other' },
];
