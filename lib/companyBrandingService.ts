/**
 * Local Company Branding Registry
 * Menyimpan mapping logo dan theme color tiap company di localStorage & default fallback
 * agar logo & warna konsisten di seluruh app-hr tanpa dependensi schema Supabase.
 */

export interface CompanyBrandConfig {
  logoUrl?: string;
  color?: string; // Hex color e.g. #12346a or #10b981
}

const STORAGE_KEY = 'gesit_company_branding_map_v1';

// Default presets untuk unit bisnis The Gesit Companies
export const DEFAULT_COMPANY_BRANDING: Record<string, CompanyBrandConfig> = {
  'PT Gesit Perkasa': {
    logoUrl: '/image/gesit_perkasa_logo.jpg',
    color: '#12346a',
  },
  'Gesit Foundation': {
    logoUrl: '/image/gesit_foundation_logo.png',
    color: '#059669', // Emerald green khas yayasan
  },
  'PT Gesit Alumas': {
    logoUrl: '/image/gesit_perkasa_logo.jpg',
    color: '#10b981',
  },
  'PT Dharma Alumas Sakti': {
    logoUrl: '/image/gesit_perkasa_logo.jpg',
    color: '#0284c7',
  },
  'PT Prodas Perdana': {
    logoUrl: '/image/gesit_perkasa_logo.jpg',
    color: '#f97316',
  },
  'PT Gesit Intrade': {
    logoUrl: '/image/gesit_perkasa_logo.jpg',
    color: '#6366f1',
  },
  'PT Bumi Grafika Jaya': {
    logoUrl: '',
    color: '#8b5cf6',
  },
  'PT Gesit Bumi Persada': {
    logoUrl: '',
    color: '#0d9488',
  },
};

export function getAllCompanyBranding(): Record<string, CompanyBrandConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_COMPANY_BRANDING };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_COMPANY_BRANDING, ...parsed };
  } catch {
    return { ...DEFAULT_COMPANY_BRANDING };
  }
}

export function getCompanyBrand(companyName?: string): CompanyBrandConfig {
  if (!companyName) {
    return { logoUrl: '/image/gesit_perkasa_logo.jpg', color: '#12346a' };
  }

  const all = getAllCompanyBranding();
  // Exact match
  if (all[companyName]) return all[companyName];

  // Fuzzy match
  const clean = companyName.toUpperCase();
  for (const [key, cfg] of Object.entries(all)) {
    if (clean.includes(key.toUpperCase()) || key.toUpperCase().includes(clean)) {
      return cfg;
    }
  }

  if (clean.includes('FOUNDATION') || clean.includes('YAYASAN')) {
    return { logoUrl: '/image/gesit_foundation_logo.png', color: '#059669' };
  }

  return { logoUrl: '', color: '#12346a' };
}

export function saveCompanyBrand(companyName: string, config: CompanyBrandConfig) {
  if (!companyName) return;
  try {
    const current = getAllCompanyBranding();
    current[companyName] = {
      ...(current[companyName] || {}),
      ...config,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    // Dispatch custom event agar komponen lain langsung re-render
    window.dispatchEvent(new CustomEvent('company-branding-updated', { detail: { companyName, config } }));
  } catch (err) {
    console.error('Failed to save company branding:', err);
  }
}
