import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { FormBuilder } from './FormBuilder';
import { MOCK_CLIENT_ONBOARDING_FIELDS } from './constants';
import {
  type ClientOnboardingFormValues,
  clientOnboardingValidationSchema,
  initialClientFormValues,
} from './storybookSchema';
import {
  testFullFormSubmission,
  testFormValidationOnSubmit,
} from './playFunctions';

const meta: Meta<typeof FormBuilder<ClientOnboardingFormValues>> = {
  title: 'Components/Forms/FormBuilder',
  component: FormBuilder,
  tags: ['autodocs'],
  args: {
    onSubmit: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof FormBuilder<ClientOnboardingFormValues>>;

export const ClientOnboarding: Story = {
  args: {
    fields: MOCK_CLIENT_ONBOARDING_FIELDS,
    validationSchema: clientOnboardingValidationSchema,
    defaultValues: initialClientFormValues,
    submitText: 'Create Client Profile',
    cancelText: 'Discard',
  },
  play: testFullFormSubmission,
};

export const ValidationErrorsOnSubmit: Story = {
  args: {
    fields: MOCK_CLIENT_ONBOARDING_FIELDS,
    validationSchema: clientOnboardingValidationSchema,
    defaultValues: initialClientFormValues,
    submitText: 'Save Client',
  },
  play: testFormValidationOnSubmit,
};

export const LoadingState: Story = {
  args: {
    fields: MOCK_CLIENT_ONBOARDING_FIELDS,
    validationSchema: clientOnboardingValidationSchema,
    defaultValues: initialClientFormValues,
    submitText: 'Saving...',
    isLoading: true,
  },
};
