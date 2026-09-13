import type { Meta, StoryObj } from '@storybook/react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import type { DropdownType } from '@/types/genericTypes';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import {
  MOCK_MULTI_SELECT_OPTIONS,
  DEFAULT_MULTI_SELECT_PLACEHOLDER,
} from './constants';
import {
  type MultiSelectFormValues,
  multiSelectValidationSchema,
} from './storybookSchema';
import {
  testMultiSelect,
  testDeselectOption,
  testErrorAppearsOnBlurAndClearsOnSelection,
  testDisabledMultiSelect,
} from './playFunctions';

interface StoryProps {
  name: 'assetClasses' | 'sectors';
  label?: string;
  placeholder?: string;
  noDataMessage?: string;
  disabled?: boolean;
  options: DropdownType[];
  initialValues?: string[];
}

function MultiSelectDropdownStoryWrapper({
  name,
  label,
  placeholder = DEFAULT_MULTI_SELECT_PLACEHOLDER,
  noDataMessage,
  disabled = false,
  options,
  initialValues = [],
}: StoryProps) {
  const methods = useForm<MultiSelectFormValues>({
    resolver: yupResolver(multiSelectValidationSchema),
    defaultValues: {
      assetClasses: initialValues,
      sectors: [],
    },
    mode: 'onBlur',
  });

  return (
    <FormProvider {...methods}>
      <form style={{ maxWidth: '36rem' }}>
        <MultiSelectDropdown
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

const meta: Meta<typeof MultiSelectDropdownStoryWrapper> = {
  title: 'Components/FormInputs/MultiSelectDropdown',
  component: MultiSelectDropdownStoryWrapper,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MultiSelectDropdownStoryWrapper>;

export const Default: Story = {
  args: {
    name: 'assetClasses',
    label: 'Target Asset Classes',
    options: MOCK_MULTI_SELECT_OPTIONS,
    placeholder: 'Select asset classes...',
  },
  play: testMultiSelect,
};

export const WithPreselectedOptions: Story = {
  args: {
    name: 'assetClasses',
    label: 'Target Asset Classes',
    options: MOCK_MULTI_SELECT_OPTIONS,
    initialValues: ['EQUITIES', 'REAL_ESTATE'],
  },
  play: testDeselectOption,
};

export const ErrorAppearsOnBlurAndClearsOnSelection: Story = {
  args: {
    name: 'assetClasses',
    label: 'Target Asset Classes',
    options: MOCK_MULTI_SELECT_OPTIONS,
    placeholder: 'Select asset classes...',
  },
  play: testErrorAppearsOnBlurAndClearsOnSelection,
};

export const NoDataState: Story = {
  args: {
    name: 'sectors',
    label: 'Sectors',
    options: [],
    noDataMessage: 'No sectors configured',
  },
};

export const Disabled: Story = {
  args: {
    name: 'assetClasses',
    label: 'Target Asset Classes',
    options: MOCK_MULTI_SELECT_OPTIONS,
    initialValues: ['EQUITIES'],
    disabled: true,
  },
  play: testDisabledMultiSelect,
};
