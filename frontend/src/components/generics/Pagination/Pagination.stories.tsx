import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Pagination } from './Pagination';
import {
  testPaginationNavigation,
  testPageSizeChange,
  testFirstPageButtonsDisabled,
} from './playFunctions';

const meta: Meta<typeof Pagination> = {
  title: 'Components/Generics/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  args: {
    onPageChange: fn(),
    onPageSizeChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  args: {
    currentPage: 1,
    pageSize: 10,
    totalItems: 142,
  },
  play: testPaginationNavigation,
};

export const FirstPageBoundaries: Story = {
  args: {
    currentPage: 1,
    pageSize: 10,
    totalItems: 142,
  },
  play: testFirstPageButtonsDisabled,
};

export const MiddlePage: Story = {
  args: {
    currentPage: 5,
    pageSize: 10,
    totalItems: 142,
  },
};

export const LastPage: Story = {
  args: {
    currentPage: 15,
    pageSize: 10,
    totalItems: 142,
  },
};

export const ChangePageSize: Story = {
  args: {
    currentPage: 1,
    pageSize: 10,
    totalItems: 500,
  },
  play: testPageSizeChange,
};

export const Disabled: Story = {
  args: {
    currentPage: 2,
    pageSize: 10,
    totalItems: 142,
    disabled: true,
  },
};
