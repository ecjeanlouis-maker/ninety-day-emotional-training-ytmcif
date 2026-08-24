
import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        <Label>Today</Label>
        <Icon sf={{ default: 'house', selected: 'house.fill' }} drawable="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="program">
        <Label>Program</Label>
        <Icon sf={{ default: 'list.bullet', selected: 'list.bullet' }} drawable="list" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="track">
        <Label>Track</Label>
        <Icon sf={{ default: 'heart', selected: 'heart.fill' }} drawable="favorite" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="journal">
        <Label>Journal</Label>
        <Icon sf={{ default: 'book.closed', selected: 'book.closed.fill' }} drawable="book" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Label>Profile</Label>
        <Icon sf={{ default: 'person', selected: 'person.fill' }} drawable="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
