import type { Meta, StoryObj } from '@storybook/react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import type { DropdownType } from '@/types/genericTypes';
import { SingleSelectDropdown } from './SingleSelectDropdown';
import {
  MOCK_DROPDOWN_OPTIONS,
  DEFAULT_DROPDOWN_PLACEHOLDER,
} from './constants';
import {
  type DropdownFormValues,
  dropdownValidationSchema,
} from './storybookSchema';
import {
  testDropdownSelection,
  testErrorAppearsOnBlurAndClearsOnSelection,
  testDisabledDropdown,
} from './playFunctions';

interface StoryProps {
  name: 'riskProfile' | 'investmentTier';
  label?: string;
  placeholder?: string;
  noDataMessage?: string;
  disabled?: boolean;
  options: DropdownType[];
  initialValue?: string;
}

function SingleSelectDropdownStoryWrapper({
  name,
  label,
  placeholder = DEFAULT_DROPDOWN_PLACEHOLDER,
  noDataMessage,
  disabled = false,
  options,
  initialValue = '',
}: StoryProps) {
  const methods = useForm<DropdownFormValues>({
    resolver: yupResolver(dropdownValidationSchema),
    defaultValues: {
      riskProfile: initialValue,
      investmentTier: '',
    },
    mode: 'onBlur',
  });

  return (
    <FormProvider {...methods}>
      <form style={{ maxWidth: '36rem' }}>
        <SingleSelectDropdown
          name={name}
          label={label}
          placeholder={placeholder}
          noDataMessage={noDataMessage}
          disabled={disabled}
          options={options}
        />
      </form>
    </FormProvider>
  );
}

const meta: Meta<typeof SingleSelectDropdownStoryWrapper> = {
  title: 'Components/FormInputs/SingleSelectDropdown',
  component: SingleSelectDropdownStoryWrapper,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SingleSelectDropdownStoryWrapper>;

export const Default: Story = {
  args: {
    name: 'riskProfile',
    label: 'Risk Profile',
    options: MOCK_DROPDOWN_OPTIONS,
    placeholder: 'Select risk tolerance',
  },
  play: testDropdownSelection,
};

export const WithPreselectedOption: Story = {
  args: {
    name: 'riskProfile',
    label: 'Risk Profile',
    options: MOCK_DROPDOWN_OPTIONS,
    initialValue: 'GROWTH',
  },
};

export const ErrorAppearsOnBlurAndClearsOnSelection: Story = {
  args: {
    name: 'riskProfile',
    label: 'Risk Profile',
    options: MOCK_DROPDOWN_OPTIONS,
    placeholder: 'Select risk tolerance',
  },
  play: testErrorAppearsOnBlurAndClearsOnSelection,
};

export const NoDataState: Story = {
  args: {
    name: 'investmentTier',
    label: 'Investment Tier',
    options: [],
    noDataMessage: 'No investment tiers available',
  },
};

export const Disabled: Story = {
  args: {
    name: 'riskProfile',
    label: 'Risk Profile',
    options: MOCK_DROPDOWN_OPTIONS,
    disabled: true,
  },
  play: testDisabledDropdown,
};
