import { within, userEvent, expect } from '@storybook/test';
import type { StandardTableProps } from './types';
import type { MockClientRecord } from './constants';

export interface PlayContext {
  canvasElement: HTMLElement;
  args: StandardTableProps<MockClientRecord>;
}

export async function testSortingClientName({ canvasElement }: PlayContext): Promise<void> {
  const canvas = within(canvasElement);

  const sortBtn = canvas.getByRole('button', { name: /client name/i });

  // Click to sort ASC (Alexander Wright should be top)
  await userEvent.click(sortBtn);
  const cellsAsc = canvas.getAllByRole('cell');
  await expect(cellsAsc[0]).toHaveTextContent('Alexander Wright');

  // Click to sort DESC (Edward Sterling should be top)
  await userEvent.click(sortBtn);
  const cellsDesc = canvas.getAllByRole('cell');
  await expect(cellsDesc[0]).toHaveTextContent('Edward Sterling');
}

export async function testRowSelection({
  canvasElement,
  args,
}: PlayContext): Promise<void> {
  const canvas = within(canvasElement);

  const selectAll = canvas.getByRole('checkbox', { name: /select all rows/i });
  await userEvent.click(selectAll);

  await expect(args.onSelectionChange).toHaveBeenCalledWith(
    expect.arrayContaining(['1', '2', '3', '4', '5']),
  );
}

export async function testRowClick({
  canvasElement,
  args,
}: PlayContext): Promise<void> {
  const canvas = within(canvasElement);

  const firstClient = canvas.getByText('Alexander Wright');
  await userEvent.click(firstClient);

  await expect(args.onRowClick).toHaveBeenCalledWith(
    expect.objectContaining({ fullName: 'Alexander Wright' }),
  );
}
