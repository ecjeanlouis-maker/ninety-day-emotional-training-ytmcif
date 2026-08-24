
import React from 'react';
import { Stack } from 'expo-router';
import FloatingTabBar, { TabBarItem } from '@/components/FloatingTabBar';

export default function TabLayout() {
  const tabs: TabBarItem[] = [
    { name: '(home)', route: '/(tabs)/(home)/', icon: 'home', label: 'Today' },
    { name: 'program', route: '/(tabs)/program', icon: 'list', label: 'Program' },
    { name: 'track', route: '/(tabs)/track', icon: 'favorite', label: 'Track' },
    { name: 'journal', route: '/(tabs)/journal', icon: 'book', label: 'Journal' },
    { name: 'profile', route: '/(tabs)/profile', icon: 'person', label: 'Profile' },
  ];

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen key="home" name="(home)" />
        <Stack.Screen key="program" name="program" />
        <Stack.Screen key="track" name="track" />
        <Stack.Screen key="journal" name="journal" />
        <Stack.Screen key="profile" name="profile" />
      </Stack>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}
