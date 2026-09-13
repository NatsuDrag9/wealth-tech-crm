import { within, userEvent, expect } from '@storybook/test';

export interface PlayContext {
  canvasElement: HTMLElement;
}

export async function testTextAreaTyping({ canvasElement }: PlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const textarea = canvas.getByRole('textbox');
  await expect(textarea).toBeInTheDocument();
  await userEvent.type(textarea, 'Portfolio review conducted with client.');
  await expect(textarea).toHaveValue('Portfolio review conducted with client.');
}

export async function testErrorAppearsOnBlurAndClearsOnTyping({
  canvasElement,
}: PlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const textarea = canvas.getByRole('textbox');

  // Initially, no error is visible
  await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();

  // Focus and blur without typing
  await userEvent.click(textarea);
  await userEvent.tab();

  // Validation error appears after blur
  const alert = await canvas.findByRole('alert');
  await expect(alert).toBeInTheDocument();

  // User begins typing valid content
  await userEvent.type(textarea, 'Detailed meeting summary');

  // Error disappears immediately on keystroke
  await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
}

export async function testDisabledTextArea({ canvasElement }: PlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const textarea = canvas.getByRole('textbox');
  await expect(textarea).toBeDisabled();
  await userEvent.type(textarea, 'Ignored content');
  await expect(textarea).toHaveValue('');
}
