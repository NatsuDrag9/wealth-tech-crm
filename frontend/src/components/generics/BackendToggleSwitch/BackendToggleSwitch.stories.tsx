import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { store } from '@/store';
import { BackendToggleSwitch } from './BackendToggleSwitch';
import {
  testSwitchToJava,
  testSwitchToNode,
  testDisabledToggle,
} from './playFunctions';

const meta: Meta<typeof BackendToggleSwitch> = {
  title: 'Components/Generics/BackendToggleSwitch',
  component: BackendToggleSwitch,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <Provider store={store}>
        <MemoryRouter>
          <div style={{ padding: '2rem' }}>
            <Story />
          </div>
        </MemoryRouter>
      </Provider>
    ),
  ],
  args: {
    onChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof BackendToggleSwitch>;

export const Default: Story = {
  args: {
    activeTarget: 'nodejs',
    variant: 'compact',
  },
  play: testSwitchToJava,
};

export const JavaActive: Story = {
  args: {
    activeTarget: 'java',
    variant: 'compact',
  },
  play: testSwitchToNode,
};

export const FullVariant: Story = {
  args: {
    activeTarget: 'nodejs',
    variant: 'full',
  },
};

export const Disabled: Story = {
  args: {
    activeTarget: 'nodejs',
    variant: 'compact',
    disabled: true,
  },
  play: testDisabledToggle,
};
