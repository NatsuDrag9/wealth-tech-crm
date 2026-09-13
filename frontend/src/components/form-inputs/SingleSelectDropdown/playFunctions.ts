import { within, userEvent, expect } from '@storybook/test';

export interface PlayContext {
  canvasElement: HTMLElement;
}

export async function testDropdownSelection({ canvasElement }: PlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const trigger = canvas.getByRole('button');
  await expect(trigger).toBeInTheDocument();

  // Open dropdown
  await userEvent.click(trigger);
  const option = await canvas.findByRole('option', { name: 'Growth' });
  await expect(option).toBeInTheDocument();

  // Select option
  await userEvent.click(option);
  await expect(canvas.getByText('Growth')).toBeInTheDocument();
}

export async function testErrorAppearsOnBlurAndClearsOnSelection({
  canvasElement,
}: PlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const trigger = canvas.getByRole('button');

  // Initially, no error is visible
  await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();

  // Open and blur by pressing Escape
  await userEvent.click(trigger);
  await userEvent.keyboard('{Escape}');

  // Validation error appears after blur
  const alert = await canvas.findByRole('alert');
  await expect(alert).toBeInTheDocument();
  await expect(alert).toHaveTextContent('Risk profile is required');

  // Open dropdown and select a valid option
  await userEvent.click(trigger);
  const option = await canvas.findByRole('option', { name: 'Moderate' });
  await userEvent.click(option);

  // Error disappears immediately upon selection
  await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
}

export async function testDisabledDropdown({ canvasElement }: PlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const trigger = canvas.getByRole('button');
  await expect(trigger).toHaveAttribute('aria-disabled', 'true');
  await userEvent.click(trigger);
  await expect(canvas.queryByRole('listbox')).not.toBeInTheDocument();
}
