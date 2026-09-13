import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SearchInput } from './SearchInput';
import {
  testSearchTypingAndClear,
  testEnterKeyTriggersSearch,
  testDisabledSearch,
} from './playFunctions';

const meta: Meta<typeof SearchInput> = {
  title: 'Components/Inputs/SearchInput',
  component: SearchInput,
  tags: ['autodocs'],
  args: {
    onChange: fn(),
    onSearch: fn(),
    onClear: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SearchInput>;

export const Default: Story = {
  args: {
    placeholder: 'Search clients by name, email, or portfolio...',
  },
  play: testSearchTypingAndClear,
};

export const WithInitialValue: Story = {
  args: {
    value: 'Acme Wealth Advisory',
    placeholder: 'Search advisors...',
  },
  play: testEnterKeyTriggersSearch,
};

export const LoadingState: Story = {
  args: {
    value: 'Searching portfolios...',
    isLoading: true,
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Search locked...',
    disabled: true,
  },
  play: testDisabledSearch,
};
