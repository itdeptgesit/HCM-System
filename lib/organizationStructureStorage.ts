export interface OrgNode {
  id: string;
  name: string;
  title: string;
  type: 'executive' | 'division-head' | 'staff' | 'secretary';
  color?: string;
  avatarUrl?: string;
  personPhoto?: string;
  cardImage?: string;
  children?: OrgNode[];
  pa?: {
    id: string;
    name: string;
    title: string;
    avatarUrl?: string;
    personPhoto?: string;
    cardImage?: string;
  };
}

export const INITIAL_ORG_DATA: {
  title: string;
  topExecutives: OrgNode[];
  leftDivisions: OrgNode[];
  rightDivisions: OrgNode[];
} = {
  title: 'THE GESIT COMPANIES',
  topExecutives: [
    {
      id: 'exec-boc',
      name: 'Board of Commissioners',
      title: 'SHAREHOLDERS',
      type: 'executive',
      pa: {
        id: 'pa-boc',
        name: 'Asmawati',
        title: 'PA & Secretary',
        personPhoto: '/image/org_people/fig_asmawati.png',
      },
    },
    {
      id: 'exec-chairman',
      name: 'Jacob Soetoyo',
      title: 'CHAIRMAN',
      type: 'executive',
      personPhoto: '/image/org_people/fig_jacob.png',
      pa: {
        id: 'pa-chairman',
        name: 'Rizki Meisara Rosadi',
        title: 'PA & Secretary',
        personPhoto: '/image/org_people/fig_rizki.png',
      },
    },
    {
      id: 'exec-ceo',
      name: 'Jahja Soetoyo',
      title: 'PRESIDENT & CEO',
      type: 'executive',
      color: '#0A3468',
      personPhoto: '/image/org_people/fig_jahja.png',
      pa: {
        id: 'pa-ceo',
        name: 'Dinny Anggraini',
        title: 'PA & Secretary',
        personPhoto: '/image/org_people/fig_dinny.png',
      },
    },
    {
      id: 'exec-deputy-ceo',
      name: 'Jones Soetoyo',
      title: 'DEPUTY CEO',
      type: 'executive',
      personPhoto: '/image/org_people/fig_jones.png',
      pa: {
        id: 'pa-deputy-ceo',
        name: 'Dwi Suryati',
        title: 'PA & Secretary',
        personPhoto: '/image/org_people/fig_dwi.png',
      },
    },
  ],
  leftDivisions: [
    // 1. Corporate Affairs (Peng Tjoan)
    {
      id: 'div-ca',
      name: 'Peng Tjoan',
      title: 'VP Corporate Affair',
      type: 'division-head',
      avatarUrl: '/image/org_people/fig_peng_tjoan.png',
      personPhoto: '/image/org_people/fig_peng_tjoan.png',
      children: [
        {
          id: 'ca-avp',
          name: 'Yudha Prabowo',
          title: 'Assistant VP of Corporate Affair',
          type: 'staff',
          children: [
            {
              id: 'ca-admin',
              name: 'Ananda Ruby Nurcantika',
              title: 'Corporate Affair Admin Staff',
              type: 'staff',
            },
            {
              id: 'ca-staff',
              name: 'Thomas Tony Irawan',
              title: 'Corporate Affair Staff',
              type: 'staff',
            },
          ],
        },
        {
          id: 'ca-ext',
          name: 'Junias Hutahuruk',
          title: 'External Relations',
          type: 'staff',
        },
      ],
    },
    // 2. Finance & Accounting (Srijani Winata)
    {
      id: 'div-fa',
      name: 'Srijani Winata',
      title: 'VP Finance & Accounting',
      type: 'division-head',
      avatarUrl: '/image/org_people/fig_srijani.png',
      personPhoto: '/image/org_people/fig_srijani.png',
      children: [
        {
          id: 'fa-deputy',
          name: 'Maradona Parhorasan Manurung',
          title: 'Deputy VP Finance & Accounting',
          type: 'staff',
          children: [
            {
              id: 'fa-acc-mgr',
              name: 'Stephanie Yaputra',
              title: 'Accounting Manager',
              type: 'staff',
              children: [
                {
                  id: 'fa-acc-sr',
                  name: 'Priscilia Angsari',
                  title: 'Accounting Senior Staff',
                  type: 'staff',
                },
                {
                  id: 'fa-acc-st',
                  name: 'Vanesha Valentina',
                  title: 'Accounting Staff',
                  type: 'staff',
                },
              ],
            },
            {
              id: 'fa-fin-mgr',
              name: 'Coraevi',
              title: 'Finance Deputy Manager',
              type: 'staff',
              children: [
                {
                  id: 'fa-fin-sr',
                  name: 'Heni',
                  title: 'Finance Senior Staff',
                  type: 'staff',
                },
                {
                  id: 'fa-fin-st',
                  name: 'Mian',
                  title: 'Finance Staff',
                  type: 'staff',
                },
              ],
            },
            {
              id: 'fa-tax-mgr',
              name: 'Parawinata Naidi Gaing',
              title: 'Tax Manager',
              type: 'staff',
              children: [
                {
                  id: 'fa-tax-spv',
                  name: 'Novitasari Siregar',
                  title: 'Tax Supervisor',
                  type: 'staff',
                },
              ],
            },
            {
              id: 'fa-boc-mgr',
              name: 'Winarti',
              title: 'Finance Deputy Manager for BOC',
              type: 'staff',
              children: [
                {
                  id: 'fa-acc-spv',
                  name: 'Merly Miselly',
                  title: 'Finance & Accounting Supervisor',
                  type: 'staff',
                },
              ],
            },
          ],
        },
      ],
    },
    // 3. Property & Investment (Jave Soetoyo)
    {
      id: 'div-prop',
      name: 'Jave Soetoyo',
      title: 'VP Property & Investment',
      type: 'division-head',
      avatarUrl: '/image/org_people/fig_jave.png',
      personPhoto: '/image/org_people/fig_jave.png',
      pa: {
        id: 'pa-prop',
        name: 'Artika Octavin Manafe',
        title: 'PA & Secretary',
      },
      children: [
        {
          id: 'prop-sm-mgr',
          name: 'Corinna Soetoyo',
          title: 'Sales & Marketing Manager',
          type: 'staff',
          children: [
            {
              id: 'prop-mkt-mgr',
              name: 'Devi Ariyani',
              title: 'Marketing Manager',
              type: 'staff',
            },
          ],
        },
        {
          id: 'prop-stefanini',
          name: 'Stefanini Adriana',
          title: 'Property',
          type: 'staff',
        },
        {
          id: 'prop-pm',
          name: 'Neysa Yulita S.',
          title: 'Property Project Manager',
          type: 'staff',
          children: [
            {
              id: 'prop-fa-op',
              name: 'Petrus Voki Cahyadi',
              title: 'FA & Operation Manager',
              type: 'staff',
              children: [
                {
                  id: 'prop-tek-romli',
                  name: 'Romli',
                  title: 'Teknisi',
                  type: 'staff',
                },
              ],
            },
            {
              id: 'prop-permit',
              name: 'Yohanes Donny Triatmoko',
              title: 'Relations & Permits Dep. Manager',
              type: 'staff',
            },
            {
              id: 'prop-pdm',
              name: 'Eliaanti Christine',
              title: 'Project Deputy Manager',
              type: 'staff',
            },
            {
              id: 'prop-arch',
              name: 'Katherine',
              title: 'Architect',
              type: 'staff',
            },
            {
              id: 'prop-pdm2',
              name: 'Herviana S.',
              title: 'Property Dep. Manager',
              type: 'staff',
            },
          ],
        },
      ],
    },
    // 4. Natural Resources (Jones Soetoyo)
    {
      id: 'div-nr',
      name: 'Jones Soetoyo',
      title: 'CEO - Natural Resources',
      type: 'division-head',
      avatarUrl: '/image/org_people/fig_jones.png',
      personPhoto: '/image/org_people/fig_jones.png',
      children: [],
    },
    // 5. Gesit Foundation (Pengurus)
    {
      id: 'div-gf',
      name: 'Pengurus',
      title: 'Gesit Foundation',
      type: 'division-head',
      children: [
        {
          id: 'gf-eo',
          name: 'Angelica Thania Ivone',
          title: 'Executive Officer',
          type: 'staff',
          children: [
            {
              id: 'gf-ps',
              name: 'Christin Rajagukguk',
              title: 'Program Specialist',
              type: 'staff',
            },
            {
              id: 'gf-as',
              name: 'Edel Trudis Uto',
              title: 'Admin Staff',
              type: 'staff',
            },
          ],
        },
      ],
    },
  ],
  rightDivisions: [
    // 1. Corporate Secretary & Legal (Natalia)
    {
      id: 'div-csl',
      name: 'Natalia',
      title: 'VP Corporate Secretary & Legal',
      type: 'division-head',
      avatarUrl: '/image/org_people/fig_natalia.png',
      personPhoto: '/image/org_people/fig_natalia.png',
      children: [
        {
          id: 'csl-deputy',
          name: 'Yohan Alamsyah',
          title: 'Deputy VP CSL',
          type: 'staff',
          children: [
            {
              id: 'csl-spv1',
              name: 'Sylvia',
              title: 'Legal Supervisor',
              type: 'staff',
            },
            {
              id: 'csl-spv2',
              name: 'Desi Rahmuni',
              title: 'Legal Supervisor',
              type: 'staff',
            },
          ],
        },
        {
          id: 'csl-tbk',
          name: 'Nancy Dunda',
          title: 'Corporate Secretary - TBK',
          type: 'staff',
        },
      ],
    },
    // 2. HR & Logistics (Javier Wijaya)
    {
      id: 'div-hr',
      name: 'Javier Wijaya',
      title: 'VP HR & Logistics',
      type: 'division-head',
      avatarUrl: '/image/org_people/fig_javier.png',
      personPhoto: '/image/org_people/fig_javier.png',
      pa: {
        id: 'pa-hr',
        name: 'Nabillah Saroh Afifah',
        title: 'PA & Secretary',
      },
      children: [
        {
          id: 'hr-mgr',
          name: 'Mesrama Gultom',
          title: 'HR & Logistics Manager',
          type: 'staff',
          children: [
            {
              id: 'hr-it-spv',
              name: 'Bendry',
              title: 'IT Supervisor',
              type: 'staff',
              children: [
                {
                  id: 'hr-it-rudi',
                  name: "Rudi Si'arudin",
                  title: 'IT Staff',
                  type: 'staff',
                },
              ],
            },
            {
              id: 'hr-ga-spv',
              name: 'Noni',
              title: 'GA Supervisor',
              type: 'staff',
              children: [
                {
                  id: 'hr-staff-nisa',
                  name: 'Khairun Nisa',
                  title: 'HR Staff',
                  type: 'staff',
                },
                {
                  id: 'hr-formalities',
                  name: 'Oktafiani',
                  title: 'Formalities',
                  type: 'staff',
                },
                {
                  id: 'hr-receptionist-retno',
                  name: 'Retno Widiyati',
                  title: 'Receptionist',
                  type: 'staff',
                },
                {
                  id: 'hr-receptionist-susilo',
                  name: 'Suryadi & Susilo',
                  title: 'Receptionist',
                  type: 'staff',
                },
                {
                  id: 'hr-pa-sec',
                  name: 'Ety Sumiaty',
                  title: 'PA & Secretary',
                  type: 'staff',
                },
                {
                  id: 'hr-support',
                  name: 'Pratiwi, Sariana & Doni',
                  title: 'OB / OG',
                  type: 'staff',
                },
                {
                  id: 'hr-messenger',
                  name: 'Andri & Yunus',
                  title: 'Messenger',
                  type: 'staff',
                },
                {
                  id: 'hr-driver',
                  name: 'Julhan Sabani',
                  title: 'Driver',
                  type: 'staff',
                },
              ],
            },
          ],
        },
      ],
    },
    // 3. Trading (Javier Wijaya)
    {
      id: 'div-trading',
      name: 'Javier Wijaya',
      title: 'Trading Head',
      type: 'division-head',
      avatarUrl: '/image/org_people/fig_javier_trading.png',
      personPhoto: '/image/org_people/fig_javier_trading.png',
      children: [
        {
          id: 'trad-b',
          name: 'Suryadi Hartanto',
          title: 'Trading B',
          type: 'staff',
          children: [
            {
              id: 'trad-tek1',
              name: 'Hilaluddin',
              title: 'Trading Supervisor',
              type: 'staff',
            },
            {
              id: 'trad-adm',
              name: 'Stefani Cyntia Dwi Ningrum',
              title: 'Trading Admin Staff',
              type: 'staff',
            },
          ],
        },
        {
          id: 'trad-a',
          name: 'Tay Chong Seng',
          title: 'Trading A',
          type: 'staff',
          children: [
            {
              id: 'trad-tek-harvey',
              name: 'Harvey Kurniawan',
              title: 'Teknisi Trading',
              type: 'staff',
            },
          ],
        },
        {
          id: 'trad-fa',
          name: 'Fendra Hartanto',
          title: 'Head of Finance & Accounting',
          type: 'staff',
        },
      ],
    },
    // 4. Manufacturing (Johanes Tanro)
    {
      id: 'div-mfg',
      name: 'Johanes Tanro',
      title: 'CEO - Manufacturing',
      type: 'division-head',
      avatarUrl: '/image/org_people/johanes_tanro.png',
      personPhoto: '/image/org_people/johanes_tanro.png',
      children: [
        {
          id: 'mfg-dir',
          name: 'Javier Wijaya',
          title: 'Director',
          type: 'staff',
        },
      ],
    },
  ],
};

const STORAGE_KEY = 'gesit_corporate_organization_chart_v5';

export function loadSavedOrgData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.topExecutives && parsed.leftDivisions && parsed.rightDivisions) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load saved org chart data:', err);
  }
  return INITIAL_ORG_DATA;
}

export function saveOrgData(data: typeof INITIAL_ORG_DATA) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save org chart data:', err);
  }
}
