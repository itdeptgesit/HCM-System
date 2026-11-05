export interface OrgPerson {
  name: string;
  title: string;
  assistant?: {
    name: string;
    title: string;
  };
  children?: OrgPerson[];
}

export interface OrgDivision {
  division: string;
  color?: string;
  lead: OrgPerson;
}

export const GESIT_ORGANIZATION_DATA: {
  company: string;
  subtitle: string;
  topLevel: {
    shareholders: string;
    boardOfCommissioners: {
      lead: string;
      assistant: string;
    };
    chairman: {
      name: string;
      assistant: string;
    };
    presidentAndCEO: {
      name: string;
      assistant: string;
    };
    deputyCEO: {
      name: string;
      assistant: string;
    };
  };
  divisions: OrgDivision[];
} = {
  company: 'THE GESIT COMPANIES',
  subtitle: 'Corporate Structure & Executive Leadership',
  topLevel: {
    shareholders: 'Shareholders',
    boardOfCommissioners: {
      lead: 'Board of Commissioners',
      assistant: 'Asmawati (PA & Secretary)',
    },
    chairman: {
      name: 'Jacob Soetoyo',
      assistant: 'Rizki Meisara Rosadi (PA & Secretary)',
    },
    presidentAndCEO: {
      name: 'Jahja Soetoyo',
      assistant: 'Dinny Anggraini (PA & Secretary)',
    },
    deputyCEO: {
      name: 'Jones Soetoyo',
      assistant: 'Dwi Suryati (PA & Secretary)',
    },
  },
  divisions: [
    {
      division: 'Corporate Affairs & Legal',
      color: '#1e3a8a', // Deep Blue
      lead: {
        name: 'Peng Tjoan',
        title: 'VP Corporate Affair',
        children: [
          {
            name: 'Yudha Prabowo',
            title: 'Assistant VP of Corporate Affair',
            children: [
              {
                name: 'Ananda Ruby Nurcantika',
                title: 'Corporate Affair Admin Staff',
              },
              {
                name: 'Thomas Tony Irawan',
                title: 'Corporate Affair Staff',
              },
            ],
          },
          {
            name: 'Junias Hutahuruk',
            title: 'External Relations',
          },
          {
            name: 'Natalia',
            title: 'VP Corporate Secretary & Legal',
            children: [
              {
                name: 'Yohan Alamsyah',
                title: 'Deputy VP CSL',
                children: [
                  {
                    name: 'Sylvia',
                    title: 'Legal Supervisor',
                  },
                  {
                    name: 'Desi Rahmuni',
                    title: 'Legal Supervisor',
                  },
                ],
              },
              {
                name: 'Nancy Dunda',
                title: 'Corporate Secretary - TBK',
              },
            ],
          },
        ],
      },
    },
    {
      division: 'Finance, Accounting & Tax',
      color: '#0f766e', // Teal / Green
      lead: {
        name: 'Srijani Winata',
        title: 'VP Finance & Accounting',
        assistant: {
          name: 'Nabillah Saroh Afifah',
          title: 'PA & Secretary',
        },
        children: [
          {
            name: 'Maradona Parhorasan Manurung',
            title: 'Deputy VP Finance & Accounting',
            children: [
              {
                name: 'Stephanie Yaputra',
                title: 'Accounting Manager',
                children: [
                  {
                    name: 'Merly Miselly',
                    title: 'Finance & Accounting Supervisor',
                  },
                  {
                    name: 'Priscilia Angsari',
                    title: 'Accounting Senior Staff',
                  },
                  {
                    name: 'Vanesha Valentina',
                    title: 'Accounting Staff',
                  },
                ],
              },
              {
                name: 'Parawinata Naidi',
                title: 'Tax Manager',
                children: [
                  {
                    name: 'Novitasari Siregar',
                    title: 'Tax Supervisor',
                  },
                ],
              },
              {
                name: 'Coraevi',
                title: 'Finance Deputy Manager',
                children: [
                  {
                    name: 'Heni',
                    title: 'Finance Senior Staff',
                  },
                  {
                    name: 'Mian',
                    title: 'Finance Staff',
                  },
                ],
              },
              {
                name: 'Winarti',
                title: 'Finance Deputy Manager for BOC',
              },
            ],
          },
        ],
      },
    },
    {
      division: 'HR, IT & Logistics',
      color: '#7c3aed', // Purple
      lead: {
        name: 'Javier Wijaya',
        title: 'VP HR & Logistics',
        children: [
          {
            name: 'Mesrama Gultom',
            title: 'HR & Logistics Manager',
            children: [
              {
                name: 'Gaing',
                title: 'IT Supervisor',
                children: [
                  {
                    name: "Rudi Si'arudin",
                    title: 'IT Staff',
                  },
                ],
              },
              {
                name: 'Noni Bendry',
                title: 'GA Supervisor',
                children: [
                  {
                    name: 'Khairun Nisa',
                    title: 'HR Staff',
                  },
                  {
                    name: 'Oktafiani',
                    title: 'Formalities',
                  },
                  {
                    name: 'Suryadi & Susilo',
                    title: 'Receptionist',
                  },
                  {
                    name: 'Ety Sumiaty',
                    title: 'PA & Secretary',
                  },
                  {
                    name: 'Retno Widiyati, Pratiwi, Sariana & Doni',
                    title: 'OB / OG',
                  },
                  {
                    name: 'Andri & Yunus',
                    title: 'Messenger',
                  },
                  {
                    name: 'Julhan Sabani',
                    title: 'Driver',
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    {
      division: 'Property & Investment',
      color: '#ea580c', // Orange
      lead: {
        name: 'Jave Soetoyo',
        title: 'VP Property & Investment',
        assistant: {
          name: 'Artika Octavin Manafe',
          title: 'PA & Secretary',
        },
        children: [
          {
            name: 'Corinna Soetoyo',
            title: 'Property',
          },
          {
            name: 'Stefanini Adriana',
            title: 'Property',
          },
          {
            name: 'Neysa Yulita S.',
            title: 'Sales & Marketing Manager',
            children: [
              {
                name: 'Devi Ariyani',
                title: 'Marketing Manager',
                children: [
                  {
                    name: 'Cyntia Dwi Ningrum',
                    title: 'Marketing Staff',
                  },
                ],
              },
            ],
          },
          {
            name: 'Fendra Hartanto',
            title: 'Project Manager',
            children: [
              {
                name: 'Petrus Voki Cahyadi',
                title: 'FA & Operation Manager',
              },
              {
                name: 'Yohanes Donny Triatmoko',
                title: 'Project Deputy Manager',
              },
              {
                name: 'Eliaanti Christine',
                title: 'Relations & Permits Dep. Manager',
              },
              {
                name: 'Katherine',
                title: 'Architect',
              },
              {
                name: 'Herviana S.',
                title: 'Property Dep. Manager',
              },
            ],
          },
        ],
      },
    },
    {
      division: 'Trading',
      color: '#0891b2', // Cyan
      lead: {
        name: 'Javier Wijaya',
        title: 'Trading Head',
        children: [
          {
            name: 'Tay Chong Seng',
            title: 'Trading A - Head of Finance & Accounting',
          },
          {
            name: 'Suryadi Hartanto',
            title: 'Trading B - Head of Trading',
            children: [
              {
                name: 'Trading Supervisor',
                title: 'Supervisor',
              },
              {
                name: 'Hilaluddin',
                title: 'Teknisi Trading',
              },
              {
                name: 'Harvey Kurniawan',
                title: 'Teknisi Trading',
              },
              {
                name: 'Stefani',
                title: 'Trading Admin Staff',
              },
              {
                name: 'Romli',
                title: 'Teknisi',
              },
            ],
          },
        ],
      },
    },
    {
      division: 'Business Units & Manufacturing',
      color: '#475569', // Slate
      lead: {
        name: 'The Gesit Business Units',
        title: 'Manufacturing & Natural Resources',
        children: [
          {
            name: 'Jones Soetoyo',
            title: 'CEO - Manufacturing',
          },
          {
            name: 'Johanes Tanro',
            title: 'CEO - Natural Resources',
          },
          {
            name: 'Javier Wijaya',
            title: 'Director',
          },
        ],
      },
    },
  ],
};
