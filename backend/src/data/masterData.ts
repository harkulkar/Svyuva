/**
 * Configurable registration master data.
 *
 * Dropdown *fields* match the live college signup:
 * https://app.svyuvasuraksha.org/sign-up
 *
 * Option values (except Maharashtra district names) are marked
 * TODO: VERIFY OFFICIAL MASTER DATA until confirmed against an official
 * source or the data-migration extract.
 */

export const MASTER_DATA_VERIFICATION = 'TODO: VERIFY OFFICIAL MASTER DATA';

export const EXCLUSIVE_TYPES = ['Exclusive', 'Non Exclusive'] as const;
export const LOCATION_TYPES = ['Rural', 'Urban'] as const;
export const MINORITY_TYPES = ['Minority', 'Non Minority'] as const;
export const LINGUISTIC_TYPES = ['Linguistic', 'Non Linguistic'] as const;
export const COLLEGE_TYPES = ['Government', 'Aided', 'Unaided', 'Autonomous'] as const;

/** Public geography — Government of Maharashtra districts. */
export const DISTRICTS = [
  'Ahmednagar',
  'Akola',
  'Amravati',
  'Beed',
  'Bhandara',
  'Buldhana',
  'Chandrapur',
  'Chhatrapati Sambhajinagar',
  'Dharashiv',
  'Dhule',
  'Gadchiroli',
  'Gondia',
  'Hingoli',
  'Jalgaon',
  'Jalna',
  'Kolhapur',
  'Latur',
  'Mumbai City',
  'Mumbai Suburban',
  'Nagpur',
  'Nanded',
  'Nandurbar',
  'Nashik',
  'Palghar',
  'Parbhani',
  'Pune',
  'Raigad',
  'Ratnagiri',
  'Sangli',
  'Satara',
  'Sindhudurg',
  'Solapur',
  'Thane',
  'Wardha',
  'Washim',
  'Yavatmal'
] as const;

/** TODO: VERIFY OFFICIAL MASTER DATA — DHE joint-director regions. */
export const JD_REGIONS = [
  'Mumbai',
  'Pune',
  'Nagpur',
  'Chhatrapati Sambhajinagar',
  'Amravati',
  'Nashik',
  'Kolhapur',
  'Nanded',
  'Jalgaon',
  'Panvel'
] as const;

export type ExclusiveType = (typeof EXCLUSIVE_TYPES)[number];
export type LocationType = (typeof LOCATION_TYPES)[number];
export type MinorityType = (typeof MINORITY_TYPES)[number];
export type LinguisticType = (typeof LINGUISTIC_TYPES)[number];
export type CollegeType = (typeof COLLEGE_TYPES)[number];
export type District = (typeof DISTRICTS)[number];
export type JdRegion = (typeof JD_REGIONS)[number];

export function publicMasterData() {
  return {
    verification: MASTER_DATA_VERIFICATION,
    exclusiveTypes: [...EXCLUSIVE_TYPES],
    locationTypes: [...LOCATION_TYPES],
    minorityTypes: [...MINORITY_TYPES],
    linguisticTypes: [...LINGUISTIC_TYPES],
    collegeTypes: [...COLLEGE_TYPES],
    districts: [...DISTRICTS],
    jdRegions: [...JD_REGIONS],
    talukasByDistrict: {} as Record<string, string[]>
  };
}

export function isOneOf<T extends string>(value: string, allowed: readonly T[]): value is T {
  return (allowed as readonly string[]).includes(value);
}
