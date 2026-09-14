import { within, userEvent, expect } from '@storybook/test';

export interface PlayContext {
  canvasElement: HTMLElement;
}

export async function testInputTyping({ canvasElement }: PlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const input = canvas.getByRole('textbox');
  await expect(input).toBeInTheDocument();
  await userEvent.type(input, 'Jane Doe');
  await expect(input).toHaveValue('Jane Doe');
}

export async function testErrorAppearsOnBlurAndClearsOnTyping({
  canvasElement,
}: PlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const input = canvas.getByRole('textbox');

  // Initially, no validation error is shown
  await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();

  // Focus and blur without entering content
  await userEvent.click(input);
  await userEvent.tab();

  // Validation error appears dynamically from Yup schema
  const alert = await canvas.findByRole('alert');
  await expect(alert).toBeInTheDocument();

  // User begins typing valid content
  await userEvent.type(input, 'advisor@wealthtech.com');

  // Error disappears immediately on keystroke
  await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
}

export async function testDisabledInput({ canvasElement }: PlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const input = canvas.getByRole('textbox');
  await expect(input).toBeDisabled();
  await userEvent.type(input, 'Ignored text');
  await expect(input).toHaveValue('');
}

export async function testPasswordVisibilityToggle({
  canvasElement,
}: PlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const input = canvasElement.querySelector('input') as HTMLInputElement;
  await expect(input).toBeInTheDocument();
  await expect(input.type).toBe('password');

  await userEvent.type(input, 'SuperSecret123!');
  await expect(input).toHaveValue('SuperSecret123!');

  const toggleBtn = canvas.getByRole('button', { name: /show password/i });
  await expect(toggleBtn).toBeInTheDocument();

  await userEvent.click(toggleBtn);
  await expect(input.type).toBe('text');
  await expect(canvas.getByRole('button', { name: /hide password/i })).toBeInTheDocument();

  await userEvent.click(canvas.getByRole('button', { name: /hide password/i }));
  await expect(input.type).toBe('password');
}
