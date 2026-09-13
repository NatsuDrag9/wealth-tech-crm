import type { DropdownType } from '@/types/genericTypes';
import type { FormFieldConfig } from './types';

export const DEFAULT_SUBMIT_TEXT = 'Submit';
export const DEFAULT_CANCEL_TEXT = 'Cancel';

export const MOCK_RISK_OPTIONS: DropdownType[] = [
  { value: 'CONSERVATIVE', displayName: 'Conservative' },
  { value: 'MODERATE', displayName: 'Moderate' },
  { value: 'GROWTH', displayName: 'Growth' },
  { value: 'AGGRESSIVE', displayName: 'Aggressive' },
];

export const MOCK_ASSET_CLASS_OPTIONS: DropdownType[] = [
  { value: 'EQUITIES', displayName: 'Equities' },
  { value: 'FIXED_INCOME', displayName: 'Fixed Income' },
  { value: 'REAL_ESTATE', displayName: 'Real Estate' },
  { value: 'COMMODITIES', displayName: 'Commodities' },
  { value: 'CASH', displayName: 'Cash & Equivalents' },
];

export const MOCK_CLIENT_ONBOARDING_FIELDS: FormFieldConfig[] = [
  {
    fieldType: 'input',
    name: 'fullName',
    label: 'Full Name',
    placeholder: 'e.g. John Doe',
    colSpan: 1,
  },
  {
    fieldType: 'input',
    name: 'email',
    label: 'Email Address',
    inputType: 'email',
    placeholder: 'e.g. john.doe@wealthtech.com',
    colSpan: 1,
  },
  {
    fieldType: 'input',
    name: 'phone',
    label: 'Phone Number',
    inputType: 'tel',
    placeholder: 'e.g. +1 (555) 012-3456',
    colSpan: 1,
  },
  {
    fieldType: 'select',
    name: 'riskProfile',
    label: 'Risk Profile',
    options: MOCK_RISK_OPTIONS,
    placeholder: 'Select client risk profile',
    colSpan: 1,
  },
  {
    fieldType: 'multiselect',
    name: 'assetClasses',
    label: 'Target Asset Classes',
    options: MOCK_ASSET_CLASS_OPTIONS,
    placeholder: 'Select asset classes...',
    colSpan: 2,
  },
  {
    fieldType: 'textarea',
    name: 'notes',
    label: 'Initial Consultation Notes',
    placeholder: 'Record key client objectives and notes...',
    colSpan: 2,
  },
];
