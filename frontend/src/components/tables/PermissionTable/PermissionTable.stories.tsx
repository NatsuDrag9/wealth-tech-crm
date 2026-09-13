import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { PermissionTable } from './PermissionTable';
import { MOCK_PERMISSIONS } from './constants';
import {
  testSinglePermissionToggle,
  testRowToggle,
  testCategoryToggle,
  testGlobalToggle,
} from './playFunctions';

const meta: Meta<typeof PermissionTable> = {
  title: 'Components/Tables/PermissionTable',
  component: PermissionTable,
  tags: ['autodocs'],
  args: {
    permissions: MOCK_PERMISSIONS,
    selectedPermissionIds: ['1', '2', '3', '5', '9', '13', '21'],
    onChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof PermissionTable>;

export const Default: Story = {
  args: {
    selectedPermissionIds: ['1', '2', '3', '5', '9', '13', '21'],
  },
  play: testSinglePermissionToggle,
};

export const RowSelection: Story = {
  args: {
    selectedPermissionIds: ['1', '5'],
  },
  play: testRowToggle,
};

export const CategorySelection: Story = {
  args: {
    selectedPermissionIds: ['1', '2'],
  },
  play: testCategoryToggle,
};

export const GlobalSelection: Story = {
  args: {
    selectedPermissionIds: ['1'],
  },
  play: testGlobalToggle,
};

export const ReadOnlyView: Story = {
  args: {
    readOnly: true,
    selectedPermissionIds: ['1', '2', '3', '5', '7', '9', '10', '13', '21'],
  },
};

export const AllPermissionsGranted: Story = {
  args: {
    selectedPermissionIds: MOCK_PERMISSIONS.map((p) => p.id),
  },
};

export const LoadingState: Story = {
  args: {
    isLoading: true,
  },
};

export const EmptyState: Story = {
  args: {
    permissions: [],
  },
};
