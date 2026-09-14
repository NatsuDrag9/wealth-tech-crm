import { within, userEvent, expect } from '@storybook/test';
import type { BackendToggleSwitchProps } from './types';

export interface PlayFunctionContext {
  canvasElement: HTMLElement;
  args: BackendToggleSwitchProps;
}

export async function testSwitchToNode({
  canvasElement,
  args,
}: PlayFunctionContext): Promise<void> {
  const canvas = within(canvasElement);
  const nodeBtn = canvas.getByRole('button', { name: /^NodeJS$/i });

  await expect(nodeBtn).toBeInTheDocument();
  await userEvent.click(nodeBtn);

  if (args.onChange) {
    await expect(args.onChange).toHaveBeenCalledWith('nodejs');
  }
}

export async function testSwitchToJava({
  canvasElement,
  args,
}: PlayFunctionContext): Promise<void> {
  const canvas = within(canvasElement);
  const javaBtn = canvas.getByRole('button', { name: /^Java$/i });

  await expect(javaBtn).toBeInTheDocument();
  await userEvent.click(javaBtn);

  if (args.onChange) {
    await expect(args.onChange).toHaveBeenCalledWith('java');
  }
}

export async function testDisabledToggle({
  canvasElement,
  args,
}: PlayFunctionContext): Promise<void> {
  const canvas = within(canvasElement);
  const javaBtn = canvas.getByRole('button', { name: /^Java$/i });
  const nodeBtn = canvas.getByRole('button', { name: /^NodeJS$/i });

  await expect(javaBtn).toBeDisabled();
  await expect(nodeBtn).toBeDisabled();

  await userEvent.click(javaBtn);
  if (args.onChange) {
    await expect(args.onChange).not.toHaveBeenCalled();
  }
}
