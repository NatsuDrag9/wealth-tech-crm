import { within, userEvent, expect } from '@storybook/test';
import type { SingleSelectGenericDropdownProps } from './types';

export interface DropdownPlayContext {
  canvasElement: HTMLElement;
  args: SingleSelectGenericDropdownProps;
}

export async function testDropdownSelection({
  canvasElement,
  args,
}: DropdownPlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const control = canvas.getByRole('button');
  await userEvent.click(control);

  if (args.options.length > 0) {
    const firstOption = canvas.getByText(args.options[0].displayName);
    await expect(firstOption).toBeInTheDocument();
    await userEvent.click(firstOption);
    await expect(args.onChange).toHaveBeenCalledWith(
      args.options[0].value,
      args.options[0],
    );
  }
}

export async function testTypeaheadSearch({
  canvasElement,
  args,
}: DropdownPlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const control = canvas.getByRole('button');
  control.focus();

  if (args.options.length > 1) {
    const target = args.options[1];
    await userEvent.keyboard(target.displayName.slice(0, 3));
    await userEvent.keyboard('{Enter}');
    await expect(args.onChange).toHaveBeenCalledWith(target.value, target);
  }
}

export async function testNoDataState({
  canvasElement,
  args,
}: DropdownPlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const control = canvas.getByRole('button');
  await userEvent.click(control);
  const emptyState = canvas.getByRole('status');
  await expect(emptyState).toHaveTextContent(
    args.noDataMessage || 'No options available',
  );
}

export async function testDisabledDropdown({
  canvasElement,
  args,
}: DropdownPlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const control = canvas.getByRole('button');
  await expect(control).toHaveAttribute('aria-disabled', 'true');
  await userEvent.click(control);
  await expect(args.onChange).not.toHaveBeenCalled();
}
