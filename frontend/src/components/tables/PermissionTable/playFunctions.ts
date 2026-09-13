import { within, userEvent, expect } from '@storybook/test';
import type { PermissionTableProps } from './types';

export interface PlayContext {
  canvasElement: HTMLElement;
  args: PermissionTableProps;
}

export async function testSinglePermissionToggle({
  canvasElement,
  args,
}: PlayContext): Promise<void> {
  const canvas = within(canvasElement);

  // Toggle View Client permission
  const viewClientCheckbox = canvas.getByRole('checkbox', {
    name: /permission view client \(client:read\)/i,
  });
  await userEvent.click(viewClientCheckbox);

  await expect(args.onChange).toHaveBeenCalled();
}

export async function testRowToggle({
  canvasElement,
  args,
}: PlayContext): Promise<void> {
  const canvas = within(canvasElement);

  // Toggle row for Clients
  const rowCheckbox = canvas.getByRole('checkbox', {
    name: /select all permissions for clients/i,
  });
  await userEvent.click(rowCheckbox);

  await expect(args.onChange).toHaveBeenCalled();
}

export async function testCategoryToggle({
  canvasElement,
  args,
}: PlayContext): Promise<void> {
  const canvas = within(canvasElement);

  // Toggle Client Management category
  const categoryCheckbox = canvas.getByRole('checkbox', {
    name: /select all permissions for client management/i,
  });
  await userEvent.click(categoryCheckbox);

  await expect(args.onChange).toHaveBeenCalled();
}

export async function testGlobalToggle({
  canvasElement,
  args,
}: PlayContext): Promise<void> {
  const canvas = within(canvasElement);

  // Toggle All Access global header checkbox
  const globalCheckbox = canvas.getByRole('checkbox', {
    name: /select all permissions across all modules/i,
  });
  await userEvent.click(globalCheckbox);

  await expect(args.onChange).toHaveBeenCalled();
}
