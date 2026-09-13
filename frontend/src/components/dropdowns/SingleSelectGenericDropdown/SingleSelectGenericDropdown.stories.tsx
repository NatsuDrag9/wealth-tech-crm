import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import type { DropdownType } from '@/types/genericTypes';
import { SingleSelectGenericDropdown } from './SingleSelectGenericDropdown';
import { MOCK_DROPDOWN_OPTIONS } from './constants';
import {
  testDropdownSelection,
  testTypeaheadSearch,
  testNoDataState,
  testDisabledDropdown,
} from './playFunctions';

const options: DropdownType[] = MOCK_DROPDOWN_OPTIONS.map((opt) => ({
  displayName: opt.displayName,
  value: opt.value,
}));

const meta: Meta<typeof SingleSelectGenericDropdown> = {
  title: 'Components/Dropdowns/SingleSelectGenericDropdown',
  component: SingleSelectGenericDropdown,
  tags: ['autodocs'],
  args: {
    onChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SingleSelectGenericDropdown>;

export const Default: Story = {
  args: {
    label: 'Client Status',
    options,
    placeholder: 'Select a status',
  },
  play: testDropdownSelection,
};

export const WithSelectedValue: Story = {
  args: {
    label: 'Client Status',
    options,
    value: 'ACTIVE',
  },
};

export const TypeaheadSearch: Story = {
  args: {
    label: 'Client Status',
    options,
    placeholder: 'Type "Pen" to highlight Pending Review',
  },
  play: testTypeaheadSearch,
};

export const NoDataState: Story = {
  args: {
    label: 'Empty Category',
    options: [],
    noDataMessage: 'No options available in this category',
  },
  play: testNoDataState,
};

export const WithError: Story = {
  args: {
    label: 'Client Status',
    options,
    error: 'Status selection is mandatory',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Client Status',
    options,
    disabled: true,
  },
  play: testDisabledDropdown,
};
