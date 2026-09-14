import type { Meta, StoryObj } from '@storybook/react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormInput } from './FormInput';
import type { FormInputType } from './types';
import { type FormValues, validationSchema } from './storybookSchema';
import {
  testInputTyping,
  testErrorAppearsOnBlurAndClearsOnTyping,
  testDisabledInput,
  testPasswordVisibilityToggle,
} from './playFunctions';

interface StoryProps {
  name: 'email' | 'phone' | 'fullName' | 'aum' | 'password';
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
  const methods = useForm<FormValues>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      email: '',
      phone: '',
      fullName: '',
      aum: '',
      password: '',
    },
    mode: 'onBlur',
  });

  return (
    <FormProvider {...methods}>
      <form style={{ maxWidth: '36rem' }}>
        <FormInput
          name={name}
          label={label}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
        />
      </form>
    </FormProvider>
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

export const Password: Story = {
  args: {
    name: 'password',
    label: 'Account Password',
    type: 'password',
    placeholder: 'Enter secure password',
  },
  play: testPasswordVisibilityToggle,
};
