import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { StandardTable } from './StandardTable';
import type { ColumnDef } from './types';
import { MOCK_CLIENT_DATA, type MockClientRecord } from './constants';
import {
  testSortingClientName,
  testRowSelection,
  testRowClick,
} from './playFunctions';

const columns: ColumnDef<MockClientRecord>[] = [
  {
    key: 'fullName',
    header: 'Client Name',
    width: '20rem',
    sortable: true,
  },
  {
    key: 'email',
    header: 'Email Address',
    width: '26rem',
  },
  {
    key: 'tier',
    header: 'Tier',
    width: '14rem',
    sortable: true,
  },
  {
    key: 'aum',
    header: 'Total AUM',
    width: '16rem',
    sortable: true,
    render: (row) => `$${row.aum.toLocaleString()}`,
  },
  {
    key: 'status',
    header: 'Status',
    width: '12rem',
    sortable: true,
  },
];

const meta: Meta<typeof StandardTable<MockClientRecord>> = {
  title: 'Components/Tables/StandardTable',
  component: StandardTable,
  tags: ['autodocs'],
  args: {
    onRowClick: fn(),
    onSelectionChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof StandardTable<MockClientRecord>>;

export const Default: Story = {
  args: {
    columns,
    data: MOCK_CLIENT_DATA,
    rowKey: 'id',
  },
  play: testSortingClientName,
};

export const WithRowSelection: Story = {
  args: {
    columns,
    data: MOCK_CLIENT_DATA,
    rowKey: 'id',
    selectable: true,
    selectedRowKeys: ['1'],
  },
  play: testRowSelection,
};

export const InteractiveRowClick: Story = {
  args: {
    columns,
    data: MOCK_CLIENT_DATA,
    rowKey: 'id',
  },
  play: testRowClick,
};

export const LoadingState: Story = {
  args: {
    columns,
    data: [],
    rowKey: 'id',
    isLoading: true,
  },
};

export const EmptyState: Story = {
  args: {
    columns,
    data: [],
    rowKey: 'id',
    emptyMessage: 'No client accounts found matching the criteria',
  },
};
