import { within, userEvent, expect } from '@storybook/test';
import type { SearchInputProps } from './types';

export interface PlayContext {
  canvasElement: HTMLElement;
  args: SearchInputProps;
}

export async function testSearchTypingAndClear({
  canvasElement,
  args,
}: PlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const input = canvas.getByRole('searchbox');
  await expect(input).toBeInTheDocument();

  // Type query
  await userEvent.type(input, 'WealthTech Portfolio');
  await expect(input).toHaveValue('WealthTech Portfolio');

  // Verify clear button appears
  const clearButton = await canvas.findByRole('button', { name: /clear search/i });
  await expect(clearButton).toBeInTheDocument();

  // Click clear button
  await userEvent.click(clearButton);
  await expect(input).toHaveValue('');
  await expect(args.onChange).toHaveBeenCalledWith('');
}

export async function testEnterKeyTriggersSearch({
  canvasElement,
  args,
}: PlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const input = canvas.getByRole('searchbox');

  // Type query and press Enter
  await userEvent.type(input, 'Client Query{Enter}');
  await expect(args.onSearch).toHaveBeenCalledWith('Client Query');
}

export async function testDisabledSearch({ canvasElement }: PlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const input = canvas.getByRole('searchbox');
  await expect(input).toBeDisabled();
  await userEvent.type(input, 'Ignored');
  await expect(input).toHaveValue('');
}
