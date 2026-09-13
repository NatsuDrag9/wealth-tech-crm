import { within, userEvent, expect } from '@storybook/test';
import type { FormBuilderProps } from './types';
import type { ClientOnboardingFormValues } from './storybookSchema';

export interface PlayContext {
  canvasElement: HTMLElement;
  args: FormBuilderProps<ClientOnboardingFormValues>;
}

export async function testFullFormSubmission({
  canvasElement,
  args,
}: PlayContext): Promise<void> {
  const canvas = within(canvasElement);

  // Fill text and contact fields
  const fullNameInput = canvas.getByLabelText(/full name/i);
  await userEvent.type(fullNameInput, 'Eleanor Vance');

  const emailInput = canvas.getByLabelText(/email address/i);
  await userEvent.type(emailInput, 'eleanor.vance@wealthtech.com');

  const phoneInput = canvas.getByLabelText(/phone number/i);
  await userEvent.type(phoneInput, '+1 (555) 234-5678');

  // Select Risk Profile
  const riskTrigger = canvas.getByRole('button', { name: /select client risk profile/i });
  await userEvent.click(riskTrigger);
  const growthOption = await canvas.findByRole('option', { name: 'Growth' });
  await userEvent.click(growthOption);

  // Select Asset Classes
  const assetTrigger = canvas.getByRole('button', { name: /select asset classes/i });
  await userEvent.click(assetTrigger);
  const equitiesOption = await canvas.findByRole('option', { name: /equities/i });
  await userEvent.click(equitiesOption);
  const realEstateOption = await canvas.findByRole('option', { name: /real estate/i });
  await userEvent.click(realEstateOption);
  await userEvent.keyboard('{Escape}');

  // Fill Notes
  const notesTextarea = canvas.getByLabelText(/initial consultation notes/i);
  await userEvent.type(notesTextarea, 'High net worth client with aggressive growth horizon.');

  // Submit form
  const submitButton = canvas.getByRole('button', { name: /create client profile/i });
  await userEvent.click(submitButton);

  // Verify onSubmit was triggered
  await expect(args.onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({
      fullName: 'Eleanor Vance',
      email: 'eleanor.vance@wealthtech.com',
      phone: '+1 (555) 234-5678',
      riskProfile: 'GROWTH',
      assetClasses: ['EQUITIES', 'REAL_ESTATE'],
      notes: 'High net worth client with aggressive growth horizon.',
    }),
    expect.anything(),
  );
}

export async function testFormValidationOnSubmit({
  canvasElement,
  args,
}: PlayContext): Promise<void> {
  const canvas = within(canvasElement);

  // Submit directly without filling fields
  const submitButton = canvas.getByRole('button', { name: /save client/i });
  await userEvent.click(submitButton);

  // Verify validation errors appear
  const alerts = await canvas.findAllByRole('alert');
  await expect(alerts.length).toBeGreaterThanOrEqual(1);

  // Verify onSubmit was not called
  await expect(args.onSubmit).not.toHaveBeenCalled();
}
