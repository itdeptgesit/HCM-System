export interface OrgNode {
  id: string;
  name: string;
  title: string;
  type: 'executive' | 'division-head' | 'staff' | 'secretary';
  color?: string; // e.g. '#10223E'
  avatarUrl?: string;
  children?: OrgNode[];
  pa?: {
    id: string;
    name: string;
    title: string;
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
      name: 'Shareholders / Board of Commissioners',
      title: 'Dewan Komisaris',
      type: 'executive',
      pa: {
        id: 'pa-boc',
        name: 'Asmawati',
        title: 'PA & Secretary',
      },
    },
    {
      id: 'exec-chairman',
      name: 'Jacob Soetoyo',
      title: 'Chairman',
      type: 'executive',
      pa: {
        id: 'pa-chairman',
        name: 'Rizki Meisara Rosadi',
        title: 'PA & Secretary',
      },
    },
    {
      id: 'exec-ceo',
      name: 'Jahja Soetoyo',
      title: 'President & CEO',
      type: 'executive',
      pa: {
        id: 'pa-ceo',
        name: 'Dinny Anggraini',
        title: 'PA & Secretary',
      },
    },
    {
      id: 'exec-deputy-ceo',
      name: 'Jones Soetoyo',
      title: 'Deputy CEO',
      type: 'executive',
      pa: {
        id: 'pa-deputy-ceo',
        name: 'Dwi Suryati',
        title: 'PA & Secretary',
      },
    },
  ],
  leftDivisions: [
    {
      id: 'div-ca',
      name: 'Peng Tjoan',
      title: 'VP Corporate Affair',
      type: 'division-head',
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
    {
      id: 'div-fa',
      name: 'Srijani Winata',
      title: 'VP Finance & Accounting',
      type: 'division-head',
      pa: {
        id: 'pa-fa',
        name: 'Nabillah Saroh Afifah',
        title: 'PA & Secretary',
      },
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
                  id: 'fa-acc-spv',
                  name: 'Merly Miselly',
                  title: 'Finance & Accounting Supervisor',
                  type: 'staff',
                },
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
              id: 'fa-tax-mgr',
              name: 'Parawinata Naidi',
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
              id: 'fa-boc-mgr',
              name: 'Winarti',
              title: 'Finance Deputy Manager for BOC',
              type: 'staff',
            },
          ],
        },
      ],
    },
    {
      id: 'div-prop',
      name: 'Jave Soetoyo',
      title: 'VP Property & Investment',
      type: 'division-head',
      pa: {
        id: 'pa-prop',
        name: 'Artika Octavin Manafe',
        title: 'PA & Secretary',
      },
      children: [
        {
          id: 'prop-corinna',
          name: 'Corinna Soetoyo',
          title: 'Property',
          type: 'staff',
        },
        {
          id: 'prop-stefanini',
          name: 'Stefanini Adriana',
          title: 'Property',
          type: 'staff',
        },
        {
          id: 'prop-sm-mgr',
          name: 'Neysa Yulita S.',
          title: 'Sales & Marketing Manager',
          type: 'staff',
          children: [
            {
              id: 'prop-mkt-mgr',
              name: 'Devi Ariyani',
              title: 'Marketing Manager',
              type: 'staff',
              children: [
                {
                  id: 'prop-mkt-st',
                  name: 'Cyntia Dwi Ningrum',
                  title: 'Marketing Staff',
                  type: 'staff',
                },
              ],
            },
          ],
        },
        {
          id: 'prop-pm',
          name: 'Fendra Hartanto',
          title: 'Project Manager',
          type: 'staff',
          children: [
            {
              id: 'prop-fa-op',
              name: 'Petrus Voki Cahyadi',
              title: 'FA & Operation Manager',
              type: 'staff',
            },
            {
              id: 'prop-pdm',
              name: 'Yohanes Donny Triatmoko',
              title: 'Project Deputy Manager',
              type: 'staff',
            },
            {
              id: 'prop-permit',
              name: 'Eliaanti Christine',
              title: 'Relations & Permits Dep. Manager',
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
    {
      id: 'div-nr',
      name: 'Jones Soetoyo',
      title: 'CEO - Natural Resources',
      type: 'division-head',
      children: [],
    },
  ],
  rightDivisions: [
    {
      id: 'div-csl',
      name: 'Natalia',
      title: 'VP Corporate Secretary & Legal',
      type: 'division-head',
      children: [
        {
          id: 'csl-deputy',
          name: 'Yohan Alamsyah',
          title: 'Deputy VP Corporate Secretary & Legal',
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
    {
      id: 'div-hr',
      name: 'Javier Wijaya',
      title: 'VP HR & Logistics',
      type: 'division-head',
      children: [
        {
          id: 'hr-mgr',
          name: 'Mesrama Gultom',
          title: 'HR & Logistics Manager',
          type: 'staff',
          children: [
            {
              id: 'hr-it-spv',
              name: 'Gaing',
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
              name: 'Noni Bendry',
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
                  id: 'hr-receptionist',
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
                  name: 'Retno W., Pratiwi, Sariana & Doni',
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
    {
      id: 'div-trading',
      name: 'Javier Wijaya',
      title: 'Trading Head',
      type: 'division-head',
      children: [
        {
          id: 'trad-a',
          name: 'Tay Chong Seng',
          title: 'Trading A - Head of Finance & Accounting',
          type: 'staff',
        },
        {
          id: 'trad-b',
          name: 'Suryadi Hartanto',
          title: 'Trading B - Head of Trading',
          type: 'staff',
          children: [
            {
              id: 'trad-tek1',
              name: 'Hilaluddin & Harvey Kurniawan',
              title: 'Teknisi Trading',
              type: 'staff',
            },
            {
              id: 'trad-adm',
              name: 'Stefani',
              title: 'Trading Admin Staff',
              type: 'staff',
            },
            {
              id: 'trad-tek2',
              name: 'Romli',
              title: 'Teknisi',
              type: 'staff',
            },
          ],
        },
      ],
    },
    {
      id: 'div-mfg',
      name: 'Johanes Tanro',
      title: 'CEO - Manufacturing',
      type: 'division-head',
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

const STORAGE_KEY = 'gesit_corporate_organization_chart_v1';

export function loadSavedOrgData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load saved org chart data:', e);
  }
  return INITIAL_ORG_DATA;
}

export function saveOrgData(data: typeof INITIAL_ORG_DATA) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save org chart data:', e);
  }
}
