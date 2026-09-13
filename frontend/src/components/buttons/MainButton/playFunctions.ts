import { within, userEvent, expect } from '@storybook/test';
import type { MainButtonProps } from './types';

export interface PlayFunctionContext {
  canvasElement: HTMLElement;
  args: MainButtonProps;
}

export async function testButtonClick({
  canvasElement,
  args,
}: PlayFunctionContext): Promise<void> {
  const canvas = within(canvasElement);
  const button = canvas.getByRole('button', { name: new RegExp(args.label, 'i') });
  await expect(button).toBeInTheDocument();
  await expect(button).not.toBeDisabled();
  await userEvent.click(button);
  if (args.onClick) {
    await expect(args.onClick).toHaveBeenCalled();
  }
}

export async function testDisabledButton({
  canvasElement,
  args,
}: PlayFunctionContext): Promise<void> {
  const canvas = within(canvasElement);
  const button = canvas.getByRole('button', { name: new RegExp(args.label, 'i') });
  await expect(button).toBeInTheDocument();
  await expect(button).toBeDisabled();
  await userEvent.click(button);
  if (args.onClick) {
    await expect(args.onClick).not.toHaveBeenCalled();
  }
}

export async function testLoadingButton({
  canvasElement,
  args,
}: PlayFunctionContext): Promise<void> {
  const canvas = within(canvasElement);
  const button = canvas.getByRole('button');
  await expect(button).toBeInTheDocument();
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute('aria-busy', 'true');
  await userEvent.click(button);
  if (args.onClick) {
    await expect(args.onClick).not.toHaveBeenCalled();
  }
}
