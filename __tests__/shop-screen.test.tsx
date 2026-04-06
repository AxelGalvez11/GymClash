import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@expo/vector-icons/FontAwesome', () => 'FontAwesome');

jest.mock('@expo/vector-icons', () => ({
  FontAwesome: 'FontAwesome',
}));

jest.mock('@/hooks/use-profile', () => ({
  useProfile: () => ({
    data: {
      gym_coins: 420,
      gym_diamonds: 84,
    },
  }),
}));

jest.mock('@/stores/accent-store', () => ({
  useAccent: () => ({
    DEFAULT: '#ce96ff',
    light: '#c583ff',
    dark: '#a434ff',
  }),
}));

jest.mock('@/services/supabase', () => ({
  supabase: {},
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));

const { useQuery, useMutation, useQueryClient } = jest.requireMock('@tanstack/react-query') as {
  useQuery: jest.Mock;
  useMutation: jest.Mock;
  useQueryClient: jest.Mock;
};

const ShopScreen = require('@/app/(app)/shop').default;

describe('ShopScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useQueryClient.mockReturnValue({
      invalidateQueries: jest.fn(),
    });

    useQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      switch (queryKey[0]) {
        case 'cosmetic-catalog':
          return {
            data: [
              {
                id: 'catalog-1',
                name: 'Zenith Visor',
                description: 'Legendary visor.',
                rarity: 'legendary',
                price_coins: 1200,
              },
              {
                id: 'catalog-2',
                name: 'Neon Wrap',
                description: 'Rare wrap.',
                rarity: 'rare',
                price_coins: 350,
              },
            ],
            isLoading: false,
          };
        case 'my-inventory':
          return {
            data: [{ cosmetic_id: 'catalog-2' }],
          };
        default:
          return { data: undefined, isLoading: false };
      }
    });

    useMutation.mockReturnValue({
      isPending: false,
      mutate: jest.fn(),
    });
  });

  it('renders and switches between shop subtabs without crashing', () => {
    const screen = render(<ShopScreen />);

    expect(screen.getByText('Arena Shop')).toBeTruthy();
    expect(screen.getByText('Featured')).toBeTruthy();

    fireEvent.press(screen.getByText('Costumes'));
    expect(screen.getByText('Zenith Visor')).toBeTruthy();

    fireEvent.press(screen.getByText('Power Ups'));
    expect(screen.getByText('Power-Ups')).toBeTruthy();

    fireEvent.press(screen.getByText('Crates'));
    expect(screen.getByText('Legendary Crate')).toBeTruthy();
  });
});
