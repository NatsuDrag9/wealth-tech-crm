import { within, userEvent, expect } from '@storybook/test';

export interface PlayContext {
  canvasElement: HTMLElement;
}

export async function testDateInputTyping({ canvasElement }: PlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const input = canvas.getByLabelText(/date of birth/i);
  await expect(input).toBeInTheDocument();

  // Type valid ISO date
  await userEvent.type(input, '1990-05-15');
  await expect(input).toHaveValue('1990-05-15');
}

export async function testErrorAppearsOnBlurAndClearsOnInput({
  canvasElement,
}: PlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const input = canvas.getByLabelText(/date of birth/i);

  // Initially, no error is visible
  await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();

  // Focus and blur empty
  await userEvent.click(input);
  await userEvent.tab();

  // Validation error appears after blur
  const alert = await canvas.findByRole('alert');
  await expect(alert).toBeInTheDocument();
  await expect(alert).toHaveTextContent('Date of birth is required');

  // Type valid date
  await userEvent.type(input, '1992-08-20');

  // Error disappears immediately upon entering valid date
  await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
}

export async function testDisabledDateInput({ canvasElement }: PlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const input = canvas.getByLabelText(/date of birth/i);
  await expect(input).toBeDisabled();
}
