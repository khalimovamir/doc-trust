/**
 * AI Lawyer - Home Tab Navigator
 * Bottom tabs: Home, History, AI Lawyer, Settings
 * React Navigation v8 — native implementation with liquid glass on iOS 26+
 */

import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { AILawyerTabProvider, useAILawyerTab } from '../context/AILawyerTabContext';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import AILawyerScreen from '../screens/AILawyerScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function HomeTabNavigatorInner() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isInChat } = useAILawyerTab();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondaryText,
        tabBarStyle: { backgroundColor: colors.secondaryBackground },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: t('tabs.home'),
          tabBarIcon: Platform.select({
            ios: ({ focused }) => ({
              type: 'sfSymbol',
              name: focused ? 'square.grid.2x2.fill' : 'square.grid.2x2',
            }),
            default: ({ focused }) => ({
              type: 'materialSymbol',
              name: 'grid_view',
            }),
          }),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: t('tabs.history'),
          tabBarIcon: Platform.select({
            ios: ({ focused }) => ({
              type: 'sfSymbol',
              name: focused ? 'clock.fill' : 'clock',
            }),
            default: ({ focused }) => ({
              type: 'materialSymbol',
              name: 'schedule',
            }),
          }),
        }}
      />
      <Tab.Screen
        name="AILawyer"
        component={AILawyerScreen}
        options={{
          title: t('tabs.aiLawyer'),
          headerShown: false,
          tabBarStyle: isInChat ? { display: 'none' } : undefined,
          tabBarIcon: Platform.select({
            ios: {
              type: 'sfSymbol',
              name: 'sparkles',
            },
            default: ({ focused }) => ({
              type: 'materialSymbol',
              name: 'auto_awesome',
            }),
          }),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('tabs.settings'),
          tabBarIcon: Platform.select({
            ios: ({ focused }) => ({
              type: 'sfSymbol',
              name: focused ? 'gearshape.fill' : 'gearshape',
            }),
            default: ({ focused }) => ({
              type: 'materialSymbol',
              name: 'settings',
            }),
          }),
        }}
      />
    </Tab.Navigator>
  );
}

export default function HomeTabNavigator() {
  return (
    <AILawyerTabProvider>
      <HomeTabNavigatorInner />
    </AILawyerTabProvider>
  );
}
