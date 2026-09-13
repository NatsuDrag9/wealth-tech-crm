import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Plus, ArrowRight } from 'lucide-react';
import { MainButton } from './MainButton';
import {
  testButtonClick,
  testDisabledButton,
  testLoadingButton,
} from './playFunctions';

const meta: Meta<typeof MainButton> = {
  title: 'Components/Buttons/MainButton',
  component: MainButton,
  tags: ['autodocs'],
  args: {
    onClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof MainButton>;

export const Primary: Story = {
  args: {
    label: 'Primary Action',
    variant: 'primary',
    size: 'md',
  },
  play: testButtonClick,
};

export const Secondary: Story = {
  args: {
    label: 'Secondary Action',
    variant: 'secondary',
    size: 'md',
  },
  play: testButtonClick,
};

export const Loading: Story = {
  args: {
    label: 'Saving Record...',
    variant: 'primary',
    size: 'md',
    isLoading: true,
  },
  play: testLoadingButton,
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Action',
    variant: 'primary',
    size: 'md',
    disabled: true,
  },
  play: testDisabledButton,
};

export const WithLeftIcon: Story = {
  args: {
    label: 'Add Client',
    variant: 'primary',
    size: 'md',
    icon: <Plus size={16} />,
    iconPosition: 'left',
  },
  play: testButtonClick,
};

export const WithRightIcon: Story = {
  args: {
    label: 'Continue',
    variant: 'secondary',
    size: 'md',
    icon: <ArrowRight size={16} />,
    iconPosition: 'right',
  },
  play: testButtonClick,
};
