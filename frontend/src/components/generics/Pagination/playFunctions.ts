import { within, userEvent, expect } from '@storybook/test';
import type { PaginationProps } from './types';

export interface PlayContext {
  canvasElement: HTMLElement;
  args: PaginationProps;
}

export async function testPaginationNavigation({
  canvasElement,
  args,
}: PlayContext): Promise<void> {
  const canvas = within(canvasElement);

  const nextBtn = canvas.getByRole('button', { name: /go to next page/i });
  const lastBtn = canvas.getByRole('button', { name: /go to last page/i });

  // Click Next page
  await userEvent.click(nextBtn);
  await expect(args.onPageChange).toHaveBeenCalledWith(2);

  // Click Last page
  await userEvent.click(lastBtn);
  const totalPages = Math.ceil(args.totalItems / args.pageSize);
  await expect(args.onPageChange).toHaveBeenCalledWith(totalPages);
}

export async function testPageSizeChange({
  canvasElement,
  args,
}: PlayContext): Promise<void> {
  const canvas = within(canvasElement);
  const select = canvas.getByRole('combobox', { name: /rows per page/i });

  await userEvent.selectOptions(select, '50');
  await expect(args.onPageSizeChange).toHaveBeenCalledWith(50);
  await expect(args.onPageChange).toHaveBeenCalledWith(1);
}

export async function testFirstPageButtonsDisabled({
  canvasElement,
}: PlayContext): Promise<void> {
  const canvas = within(canvasElement);

  const firstBtn = canvas.getByRole('button', { name: /go to first page/i });
  const prevBtn = canvas.getByRole('button', { name: /go to previous page/i });
  const nextBtn = canvas.getByRole('button', { name: /go to next page/i });
  const lastBtn = canvas.getByRole('button', { name: /go to last page/i });

  await expect(firstBtn).toBeDisabled();
  await expect(prevBtn).toBeDisabled();
  await expect(nextBtn).toBeEnabled();
  await expect(lastBtn).toBeEnabled();
}
