export const DEFAULT_EMPTY_MESSAGE = 'No records found';
export const DEFAULT_SKELETON_ROWS = 5;
export const SKELETON_ROW_IDS = [
  'skeleton-row-1',
  'skeleton-row-2',
  'skeleton-row-3',
  'skeleton-row-4',
  'skeleton-row-5',
];

export interface MockClientRecord {
  id: string;
  fullName: string;
  email: string;
  tier: string;
  aum: number;
  status: string;
}

export const MOCK_CLIENT_DATA: MockClientRecord[] = [
  {
    id: '1',
    fullName: 'Alexander Wright',
    email: 'alex.wright@apexwealth.com',
    tier: 'Ultra HNW',
    aum: 12500000,
    status: 'Active',
  },
  {
    id: '2',
    fullName: 'Beatrice Chen',
    email: 'beatrice.chen@chenholdings.com',
    tier: 'HNW',
    aum: 4800000,
    status: 'Active',
  },
  {
    id: '3',
    fullName: 'Charles Montgomery',
    email: 'charles.m@montgomerycap.com',
    tier: 'Affluent',
    aum: 1200000,
    status: 'Pending',
  },
  {
    id: '4',
    fullName: 'Diana Prince',
    email: 'diana.prince@themyscira.org',
    tier: 'Ultra HNW',
    aum: 28000000,
    status: 'Active',
  },
  {
    id: '5',
    fullName: 'Edward Sterling',
    email: 'edward@sterlingpartners.com',
    tier: 'HNW',
    aum: 6500000,
    status: 'Inactive',
  },
];
