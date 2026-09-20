export interface CountryLanguageOption {
  code: string; // ISO 2-letter country code
  country: string; // Country name
  language: string; // Primary national/official language name
  langCode: string; // Language code (e.g., 'en', 'fr', 'es', 'ar')
  nativeLang: string; // Native name of language
  currency: string; // Standard currency code
  currencySymbol: string; // Currency symbol
  timezone: string; // Primary default timezone
  flag: string; // Emoji flag
}

export const WORLD_COUNTRIES_AND_LANGUAGES: CountryLanguageOption[] = [
  // North America
  { code: 'US', country: 'United States', language: 'English (US)', langCode: 'en-US', nativeLang: 'English', currency: 'USD', currencySymbol: '$', timezone: 'America/New_York', flag: '🇺🇸' },
  { code: 'CA', country: 'Canada', language: 'English / French', langCode: 'en-CA', nativeLang: 'English / Français', currency: 'CAD', currencySymbol: '$', timezone: 'America/Toronto', flag: '🇨🇦' },
  { code: 'MX', country: 'Mexico', language: 'Spanish (Español)', langCode: 'es-MX', nativeLang: 'Español', currency: 'MXN', currencySymbol: '$', timezone: 'America/Mexico_City', flag: '🇲🇽' },

  // Europe
  { code: 'GB', country: 'United Kingdom', language: 'English (UK)', langCode: 'en-GB', nativeLang: 'English', currency: 'GBP', currencySymbol: '£', timezone: 'Europe/London', flag: '🇬🇧' },
  { code: 'FR', country: 'France', language: 'French (Français)', langCode: 'fr-FR', nativeLang: 'Français', currency: 'EUR', currencySymbol: '€', timezone: 'Europe/Paris', flag: '🇫🇷' },
  { code: 'DE', country: 'Germany', language: 'German (Deutsch)', langCode: 'de-DE', nativeLang: 'Deutsch', currency: 'EUR', currencySymbol: '€', timezone: 'Europe/Berlin', flag: '🇩🇪' },
  { code: 'ES', country: 'Spain', language: 'Spanish (Español)', langCode: 'es-ES', nativeLang: 'Español', currency: 'EUR', currencySymbol: '€', timezone: 'Europe/Madrid', flag: '🇪🇸' },
  { code: 'IT', country: 'Italy', language: 'Italian (Italiano)', langCode: 'it-IT', nativeLang: 'Italiano', currency: 'EUR', currencySymbol: '€', timezone: 'Europe/Rome', flag: '🇮🇹' },
  { code: 'PT', country: 'Portugal', language: 'Portuguese (Português)', langCode: 'pt-PT', nativeLang: 'Português', currency: 'EUR', currencySymbol: '€', timezone: 'Europe/Lisbon', flag: '🇵🇹' },
  { code: 'NL', country: 'Netherlands', language: 'Dutch (Nederlands)', langCode: 'nl-NL', nativeLang: 'Nederlands', currency: 'EUR', currencySymbol: '€', timezone: 'Europe/Amsterdam', flag: '🇳🇱' },
  { code: 'BE', country: 'Belgium', language: 'French / Dutch', langCode: 'nl-BE', nativeLang: 'Français / Nederlands', currency: 'EUR', currencySymbol: '€', timezone: 'Europe/Brussels', flag: '🇧🇪' },
  { code: 'CH', country: 'Switzerland', language: 'German / French / Italian', langCode: 'de-CH', nativeLang: 'Deutsch / Français', currency: 'CHF', currencySymbol: 'CHF', timezone: 'Europe/Zurich', flag: '🇨🇭' },
  { code: 'SE', country: 'Sweden', language: 'Swedish (Svenska)', langCode: 'sv-SE', nativeLang: 'Svenska', currency: 'SEK', currencySymbol: 'kr', timezone: 'Europe/Stockholm', flag: '🇸🇪' },
  { code: 'NO', country: 'Norway', language: 'Norwegian (Norsk)', langCode: 'no-NO', nativeLang: 'Norsk', currency: 'NOK', currencySymbol: 'kr', timezone: 'Europe/Oslo', flag: '🇳🇴' },
  { code: 'DK', country: 'Denmark', language: 'Danish (Dansk)', langCode: 'da-DK', nativeLang: 'Dansk', currency: 'DKK', currencySymbol: 'kr', timezone: 'Europe/Copenhagen', flag: '🇩🇰' },
  { code: 'FI', country: 'Finland', language: 'Finnish (Suomi)', langCode: 'fi-FI', nativeLang: 'Suomi', currency: 'EUR', currencySymbol: '€', timezone: 'Europe/Helsinki', flag: '🇫🇮' },
  { code: 'PL', country: 'Poland', language: 'Polish (Polski)', langCode: 'pl-PL', nativeLang: 'Polski', currency: 'PLN', currencySymbol: 'zł', timezone: 'Europe/Warsaw', flag: '🇵🇱' },
  { code: 'TR', country: 'Turkey', language: 'Turkish (Türkçe)', langCode: 'tr-TR', nativeLang: 'Türkçe', currency: 'TRY', currencySymbol: '₺', timezone: 'Europe/Istanbul', flag: '🇹🇷' },
  { code: 'GR', country: 'Greece', language: 'Greek (Ελληνικά)', langCode: 'el-GR', nativeLang: 'Ελληνικά', currency: 'EUR', currencySymbol: '€', timezone: 'Europe/Athens', flag: '🇬🇷' },
  { code: 'IE', country: 'Ireland', language: 'English / Irish', langCode: 'en-IE', nativeLang: 'English / Gaeilge', currency: 'EUR', currencySymbol: '€', timezone: 'Europe/Dublin', flag: '🇮🇪' },

  // Africa
  { code: 'GH', country: 'Ghana', language: 'English (Twi / Fante)', langCode: 'en-GH', nativeLang: 'English', currency: 'GHS', currencySymbol: 'GH₵', timezone: 'Africa/Accra', flag: '🇬🇭' },
  { code: 'NG', country: 'Nigeria', language: 'English (Hausa / Yoruba / Igbo)', langCode: 'en-NG', nativeLang: 'English', currency: 'NGN', currencySymbol: '₦', timezone: 'Africa/Lagos', flag: '🇳🇬' },
  { code: 'KE', country: 'Kenya', language: 'English / Swahili (Kiswahili)', langCode: 'sw-KE', nativeLang: 'Kiswahili / English', currency: 'KES', currencySymbol: 'KSh', timezone: 'Africa/Nairobi', flag: '🇰🇪' },
  { code: 'ZA', country: 'South Africa', language: 'English / Zulu / Afrikaans', langCode: 'en-ZA', nativeLang: 'English / isiZulu', currency: 'ZAR', currencySymbol: 'R', timezone: 'Africa/Johannesburg', flag: '🇿🇦' },
  { code: 'EG', country: 'Egypt', language: 'Arabic (العربية)', langCode: 'ar-EG', nativeLang: 'العربية', currency: 'EGP', currencySymbol: 'E£', timezone: 'Africa/Cairo', flag: '🇪🇬' },
  { code: 'ET', country: 'Ethiopia', language: 'Amharic (አማርኛ) / English', langCode: 'am-ET', nativeLang: 'አማርኛ', currency: 'ETB', currencySymbol: 'Br', timezone: 'Africa/Addis_Ababa', flag: '🇪🇹' },
  { code: 'TZ', country: 'Tanzania', language: 'Swahili (Kiswahili) / English', langCode: 'sw-TZ', nativeLang: 'Kiswahili', currency: 'TZS', currencySymbol: 'TSh', timezone: 'Africa/Dar_es_Salaam', flag: '🇹🇿' },
  { code: 'UG', country: 'Uganda', language: 'English / Swahili', langCode: 'en-UG', nativeLang: 'English', currency: 'UGX', currencySymbol: 'USh', timezone: 'Africa/Kampala', flag: '🇺🇬' },
  { code: 'RW', country: 'Rwanda', language: 'Kinyarwanda / French / English', langCode: 'rw-RW', nativeLang: 'Ikinyarwanda', currency: 'RWF', currencySymbol: 'FRw', timezone: 'Africa/Kigali', flag: '🇷🇼' },
  { code: 'MA', country: 'Morocco', language: 'Arabic (العربية) / French', langCode: 'ar-MA', nativeLang: 'العربية / Français', currency: 'MAD', currencySymbol: 'DH', timezone: 'Africa/Casablanca', flag: '🇲🇦' },
  { code: 'CI', country: "Côte d'Ivoire", language: 'French (Français)', langCode: 'fr-CI', nativeLang: 'Français', currency: 'XOF', currencySymbol: 'CFA', timezone: 'Africa/Abidjan', flag: '🇨🇮' },
  { code: 'SN', country: 'Senegal', language: 'French (Français) / Wolof', langCode: 'fr-SN', nativeLang: 'Français / Wolof', currency: 'XOF', currencySymbol: 'CFA', timezone: 'Africa/Dakar', flag: '🇸🇳' },
  { code: 'CM', country: 'Cameroon', language: 'French / English', langCode: 'fr-CM', nativeLang: 'Français / English', currency: 'XAF', currencySymbol: 'FCFA', timezone: 'Africa/Douala', flag: '🇨🇲' },
  { code: 'ZM', country: 'Zambia', language: 'English', langCode: 'en-ZM', nativeLang: 'English', currency: 'ZMW', currencySymbol: 'ZK', timezone: 'Africa/Lusaka', flag: '🇿🇲' },
  { code: 'ZW', country: 'Zimbabwe', language: 'English / Shona / Ndebele', langCode: 'en-ZW', nativeLang: 'English / chiShona', currency: 'USD', currencySymbol: '$', timezone: 'Africa/Harare', flag: '🇿🇼' },

  // Middle East & West Asia
  { code: 'AE', country: 'United Arab Emirates', language: 'Arabic (العربية) / English', langCode: 'ar-AE', nativeLang: 'العربية', currency: 'AED', currencySymbol: 'AED', timezone: 'Asia/Dubai', flag: '🇦🇪' },
  { code: 'SA', country: 'Saudi Arabia', language: 'Arabic (العربية)', langCode: 'ar-SA', nativeLang: 'العربية', currency: 'SAR', currencySymbol: 'SAR', timezone: 'Asia/Riyadh', flag: '🇸🇦' },
  { code: 'QA', country: 'Qatar', language: 'Arabic (العربية)', langCode: 'ar-QA', nativeLang: 'العربية', currency: 'QAR', currencySymbol: 'QR', timezone: 'Asia/Qatar', flag: '🇶🇦' },
  { code: 'KW', country: 'Kuwait', language: 'Arabic (العربية)', langCode: 'ar-KW', nativeLang: 'العربية', currency: 'KWD', currencySymbol: 'KD', timezone: 'Asia/Kuwait', flag: '🇰🇼' },
  { code: 'OM', country: 'Oman', language: 'Arabic (العربية)', langCode: 'ar-OM', nativeLang: 'العربية', currency: 'OMR', currencySymbol: 'RO', timezone: 'Asia/Muscat', flag: '🇴🇲' },
  { code: 'BH', country: 'Bahrain', language: 'Arabic (العربية)', langCode: 'ar-BH', nativeLang: 'العربية', currency: 'BHD', currencySymbol: 'BD', timezone: 'Asia/Bahrain', flag: '🇧🇭' },
  { code: 'JO', country: 'Jordan', language: 'Arabic (العربية)', langCode: 'ar-JO', nativeLang: 'العربية', currency: 'JOD', currencySymbol: 'JD', timezone: 'Asia/Amman', flag: '🇯🇴' },
  { code: 'LB', country: 'Lebanon', language: 'Arabic / French / English', langCode: 'ar-LB', nativeLang: 'العربية', currency: 'LBP', currencySymbol: 'L£', timezone: 'Asia/Beirut', flag: '🇱🇧' },
  { code: 'IL', country: 'Israel', language: 'Hebrew (עברית) / Arabic', langCode: 'he-IL', nativeLang: 'עברית', currency: 'ILS', currencySymbol: '₪', timezone: 'Asia/Jerusalem', flag: '🇮🇱' },

  // Asia & Pacific
  { code: 'IN', country: 'India', language: 'Hindi (हिन्दी) / English', langCode: 'hi-IN', nativeLang: 'हिन्दी / English', currency: 'INR', currencySymbol: '₹', timezone: 'Asia/Kolkata', flag: '🇮🇳' },
  { code: 'PK', country: 'Pakistan', language: 'Urdu (اردو) / English', langCode: 'ur-PK', nativeLang: 'اردو / English', currency: 'PKR', currencySymbol: 'Rs', timezone: 'Asia/Karachi', flag: '🇵🇰' },
  { code: 'BD', country: 'Bangladesh', language: 'Bengali (বাংলা)', langCode: 'bn-BD', nativeLang: 'বাংলা', currency: 'BDT', currencySymbol: '৳', timezone: 'Asia/Dhaka', flag: '🇧🇩' },
  { code: 'CN', country: 'China', language: 'Simplified Chinese (简体中文)', langCode: 'zh-CN', nativeLang: '简体中文', currency: 'CNY', currencySymbol: '¥', timezone: 'Asia/Shanghai', flag: '🇨🇳' },
  { code: 'JP', country: 'Japan', language: 'Japanese (日本語)', langCode: 'ja-JP', nativeLang: '日本語', currency: 'JPY', currencySymbol: '¥', timezone: 'Asia/Tokyo', flag: '🇯🇵' },
  { code: 'KR', country: 'South Korea', language: 'Korean (한국어)', langCode: 'ko-KR', nativeLang: '한국어', currency: 'KRW', currencySymbol: '₩', timezone: 'Asia/Seoul', flag: '🇰🇷' },
  { code: 'SG', country: 'Singapore', language: 'English / Mandarin / Malay / Tamil', langCode: 'en-SG', nativeLang: 'English / 中文', currency: 'SGD', currencySymbol: 'S$', timezone: 'Asia/Singapore', flag: '🇸🇬' },
  { code: 'MY', country: 'Malaysia', language: 'Malay (Bahasa Melayu) / English', langCode: 'ms-MY', nativeLang: 'Bahasa Melayu', currency: 'MYR', currencySymbol: 'RM', timezone: 'Asia/Kuala_Lumpur', flag: '🇲🇾' },
  { code: 'ID', country: 'Indonesia', language: 'Indonesian (Bahasa Indonesia)', langCode: 'id-ID', nativeLang: 'Bahasa Indonesia', currency: 'IDR', currencySymbol: 'Rp', timezone: 'Asia/Jakarta', flag: '🇮🇩' },
  { code: 'PH', country: 'Philippines', language: 'Filipino (Tagalog) / English', langCode: 'fil-PH', nativeLang: 'Tagalog / English', currency: 'PHP', currencySymbol: '₱', timezone: 'Asia/Manila', flag: '🇵🇭' },
  { code: 'VN', country: 'Vietnam', language: 'Vietnamese (Tiếng Việt)', langCode: 'vi-VN', nativeLang: 'Tiếng Việt', currency: 'VND', currencySymbol: '₫', timezone: 'Asia/Ho_Chi_Minh', flag: '🇻🇳' },
  { code: 'TH', country: 'Thailand', language: 'Thai (ไทย)', langCode: 'th-TH', nativeLang: 'ไทย', currency: 'THB', currencySymbol: '฿', timezone: 'Asia/Bangkok', flag: '🇹🇭' },
  { code: 'AU', country: 'Australia', language: 'English (AU)', langCode: 'en-AU', nativeLang: 'English', currency: 'AUD', currencySymbol: '$', timezone: 'Australia/Sydney', flag: '🇦🇺' },
  { code: 'NZ', country: 'New Zealand', language: 'English / Māori', langCode: 'en-NZ', nativeLang: 'English / Te Reo', currency: 'NZD', currencySymbol: '$', timezone: 'Pacific/Auckland', flag: '🇳🇿' },

  // South America & Caribbean
  { code: 'BR', country: 'Brazil', language: 'Portuguese (Português do Brasil)', langCode: 'pt-BR', nativeLang: 'Português', currency: 'BRL', currencySymbol: 'R$', timezone: 'America/Sao_Paulo', flag: '🇧🇷' },
  { code: 'AR', country: 'Argentina', language: 'Spanish (Español)', langCode: 'es-AR', nativeLang: 'Español', currency: 'ARS', currencySymbol: '$', timezone: 'America/Argentina/Buenos_Aires', flag: '🇦🇷' },
  { code: 'CO', country: 'Colombia', language: 'Spanish (Español)', langCode: 'es-CO', nativeLang: 'Español', currency: 'COP', currencySymbol: '$', timezone: 'America/Bogota', flag: '🇨🇴' },
  { code: 'CL', country: 'Chile', language: 'Spanish (Español)', langCode: 'es-CL', nativeLang: 'Español', currency: 'CLP', currencySymbol: '$', timezone: 'America/Santiago', flag: '🇨🇱' },
  { code: 'PE', country: 'Peru', language: 'Spanish (Español) / Quechua', langCode: 'es-PE', nativeLang: 'Español', currency: 'PEN', currencySymbol: 'S/', timezone: 'America/Lima', flag: '🇵🇪' },
  { code: 'JM', country: 'Jamaica', language: 'English / Patois', langCode: 'en-JM', nativeLang: 'English', currency: 'JMD', currencySymbol: 'J$', timezone: 'America/Jamaica', flag: '🇯🇲' },
  { code: 'TT', country: 'Trinidad and Tobago', language: 'English', langCode: 'en-TT', nativeLang: 'English', currency: 'TTD', currencySymbol: 'TT$', timezone: 'America/Port_of_Spain', flag: '🇹🇹' }
];

export function findCountryOption(countryOrCode?: string): CountryLanguageOption | undefined {
  if (!countryOrCode) return undefined;
  const q = countryOrCode.trim().toLowerCase();
  return WORLD_COUNTRIES_AND_LANGUAGES.find(
    c => c.code.toLowerCase() === q || c.country.toLowerCase() === q
  );
}
