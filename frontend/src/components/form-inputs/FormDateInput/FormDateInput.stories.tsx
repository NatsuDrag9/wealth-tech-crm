import type { Meta, StoryObj } from '@storybook/react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormDateInput } from './FormDateInput';
import {
  type DateFormValues,
  dateValidationSchema,
} from './storybookSchema';
import {
  testDateInputTyping,
  testErrorAppearsOnBlurAndClearsOnInput,
  testDisabledDateInput,
} from './playFunctions';

interface StoryProps {
  name: 'birthDate' | 'onboardingDate';
  label?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
}

function FormDateInputStoryWrapper({
  name,
  label,
  min,
  max,
  disabled = false,
}: StoryProps) {
  const methods = useForm<DateFormValues>({
    resolver: yupResolver(dateValidationSchema),
    defaultValues: {
      birthDate: '',
      onboardingDate: '',
    },
    mode: 'onBlur',
  });

  return (
    <FormProvider {...methods}>
      <form style={{ maxWidth: '36rem' }}>
        <FormDateInput
          name={name}
          label={label}
          min={min}
          max={max}
          disabled={disabled}
        />
      </form>
    </FormProvider>
  );
}

const meta: Meta<typeof FormDateInputStoryWrapper> = {
  title: 'Components/FormInputs/FormDateInput',
  component: FormDateInputStoryWrapper,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FormDateInputStoryWrapper>;

export const Default: Story = {
  args: {
    name: 'birthDate',
    label: 'Date of Birth',
    max: '2010-01-01',
  },
  play: testDateInputTyping,
};

export const ErrorAppearsOnBlurAndClearsOnInput: Story = {
  args: {
    name: 'birthDate',
    label: 'Date of Birth',
  },
  play: testErrorAppearsOnBlurAndClearsOnInput,
};

export const Disabled: Story = {
  args: {
    name: 'birthDate',
    label: 'Date of Birth',
    disabled: true,
  },
  play: testDisabledDateInput,
};
