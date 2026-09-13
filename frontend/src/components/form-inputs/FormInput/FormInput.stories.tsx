import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormInput } from './FormInput';
import type { FormInputType } from './types';
import { type FormValues, validationSchema } from './storybookSchema';
import {
  testInputTyping,
  testErrorAppearsOnBlurAndClearsOnTyping,
  testDisabledInput,
} from './playFunctions';

interface StoryProps {
  name: 'email' | 'phone' | 'fullName' | 'aum';
  label: string;
  type?: FormInputType;
  placeholder?: string;
  disabled?: boolean;
}

function FormInputStoryWrapper({
  name,
  label,
  type = 'text',
  placeholder,
  disabled = false,
}: StoryProps) {
  const { control } = useForm<FormValues>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      email: '',
      phone: '',
      fullName: '',
      aum: '',
    },
    mode: 'onBlur',
  });

  return (
    <form style={{ maxWidth: '36rem' }}>
      <FormInput
        name={name}
        control={control}
        label={label}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
      />
    </form>
  );
}

const meta: Meta<typeof FormInputStoryWrapper> = {
  title: 'Components/FormInputs/FormInput',
  component: FormInputStoryWrapper,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FormInputStoryWrapper>;

export const Text: Story = {
  args: {
    name: 'fullName',
    label: 'Full Name',
    type: 'text',
    placeholder: 'Enter full name',
  },
  play: testInputTyping,
};

export const Email: Story = {
  args: {
    name: 'email',
    label: 'Email Address',
    type: 'email',
    placeholder: 'advisor@wealthtech.com',
  },
  play: testInputTyping,
};

export const Phone: Story = {
  args: {
    name: 'phone',
    label: 'Phone Number',
    type: 'tel',
    placeholder: '+1 (555) 000-0000',
  },
  play: testInputTyping,
};

export const NumberInput: Story = {
  args: {
    name: 'aum',
    label: 'Target AUM ($)',
    type: 'number',
    placeholder: '500000',
  },
};

export const ErrorAppearsOnBlurAndClearsOnTyping: Story = {
  args: {
    name: 'email',
    label: 'Email Address',
    type: 'email',
    placeholder: 'advisor@wealthtech.com',
  },
  play: testErrorAppearsOnBlurAndClearsOnTyping,
};

export const Disabled: Story = {
  args: {
    name: 'fullName',
    label: 'Full Name',
    type: 'text',
    disabled: true,
  },
  play: testDisabledInput,
};
