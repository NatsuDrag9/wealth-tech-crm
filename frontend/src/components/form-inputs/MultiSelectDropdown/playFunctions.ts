import { within, userEvent, expect } from '@storybook/test';

export interface PlayContext {
  canvasElement: HTMLElement;
}

export async function testMultiSelect({ canvasElement }: PlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const trigger = canvas.getByRole('button');
  await expect(trigger).toBeInTheDocument();

  // Open dropdown
  await userEvent.click(trigger);

  // Select Equities
  const equitiesOption = await canvas.findByRole('option', { name: /equities/i });
  await userEvent.click(equitiesOption);

  // Select Fixed Income
  const fixedIncomeOption = await canvas.findByRole('option', { name: /fixed income/i });
  await userEvent.click(fixedIncomeOption);

  // Verify comma-separated text in trigger
  await expect(canvas.getByText(/Equities,\s*Fixed Income/)).toBeInTheDocument();
}

export async function testDeselectOption({ canvasElement }: PlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const trigger = canvas.getByRole('button');

  // Open dropdown
  await userEvent.click(trigger);

  // Deselect Equities by clicking it
  const equitiesOption = await canvas.findByRole('option', { name: /equities/i });
  await userEvent.click(equitiesOption);

  // Verify only Real Estate remains in trigger
  await expect(canvas.getByText('Real Estate')).toBeInTheDocument();
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
  await expect(alert).toHaveTextContent('Select at least one asset class');

  // Open dropdown and select a valid option
  await userEvent.click(trigger);
  const option = await canvas.findByRole('option', { name: /commodities/i });
  await userEvent.click(option);

  // Error disappears immediately upon selection
  await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
}

export async function testDisabledMultiSelect({ canvasElement }: PlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const trigger = canvas.getByRole('button');
  await expect(trigger).toHaveAttribute('aria-disabled', 'true');
  await userEvent.click(trigger);
  await expect(canvas.queryByRole('listbox')).not.toBeInTheDocument();
}
