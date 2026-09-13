import type { Meta, StoryObj } from '@storybook/react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormTextArea } from './FormTextArea';
import { type TextAreaFormValues, textAreaValidationSchema } from './storybookSchema';
import {
  testTextAreaTyping,
  testErrorAppearsOnBlurAndClearsOnTyping,
  testDisabledTextArea,
} from './playFunctions';

interface StoryProps {
  name: 'notes' | 'summary';
  label: string;
  placeholder?: string;
  disabled?: boolean;
}

function FormTextAreaStoryWrapper({
  name,
  label,
  placeholder,
  disabled = false,
}: StoryProps) {
  const methods = useForm<TextAreaFormValues>({
    resolver: yupResolver(textAreaValidationSchema),
    defaultValues: { notes: '', summary: '' },
    mode: 'onBlur',
  });

  return (
    <FormProvider {...methods}>
      <form style={{ maxWidth: '42rem' }}>
        <FormTextArea
          name={name}
          label={label}
          placeholder={placeholder}
          disabled={disabled}
        />
      </form>
    </FormProvider>
  );
}

const meta: Meta<typeof FormTextAreaStoryWrapper> = {
  title: 'Components/FormInputs/FormTextArea',
  component: FormTextAreaStoryWrapper,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FormTextAreaStoryWrapper>;

export const Default: Story = {
  args: {
    name: 'notes',
    label: 'Meeting Notes',
    placeholder: 'Enter client meeting notes...',
  },
  play: testTextAreaTyping,
};

export const ErrorAppearsOnBlurAndClearsOnTyping: Story = {
  args: {
    name: 'notes',
    label: 'Meeting Notes',
    placeholder: 'Notes are mandatory...',
  },
  play: testErrorAppearsOnBlurAndClearsOnTyping,
};

export const Disabled: Story = {
  args: {
    name: 'notes',
    label: 'Archived Notes',
    disabled: true,
  },
  play: testDisabledTextArea,
};
