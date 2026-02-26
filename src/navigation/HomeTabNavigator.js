/**
 * Home Tab Navigator
 * Tabs: Home, History, AI Lawyer, Settings
 */

import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import AILawyerScreen from '../screens/AILawyerScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function HomeTabNavigatorInner() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors?.primary ?? '#3b82f6',
        tabBarInactiveTintColor: colors?.secondaryText ?? '#6b7280',
        tabBarStyle: { backgroundColor: colors?.secondaryBackground ?? '#ffffff' },
        // Keep tab screens mounted so content is not cleared when switching tabs
        detachInactiveScreens: false,
        ...(Platform.OS === 'android' && {
          tabBarIconStyle: { width: 24, height: 24 },
          tabBarLabelVisibilityMode: 'labeled',
        }),
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
            default: () => ({
              type: 'materialSymbol',
              name: 'grid_view',
              weight: 400,
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
            default: () => ({
              type: 'materialSymbol',
              name: 'schedule',
              weight: 400,
            }),
          }),
        }}
      />
      <Tab.Screen
        name="AILawyerTab"
        component={AILawyerScreen}
        options={{
          title: t('tabs.aiLawyer'),
          headerShown: false,
          tabBarIcon: Platform.select({
            ios: ({ focused }) => ({
              type: 'sfSymbol',
              name: focused ? 'sparkles' : 'sparkles',
            }),
            default: () => ({
              type: 'materialSymbol',
              name: 'auto_awesome',
              weight: 400,
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
            default: () => ({
              type: 'materialSymbol',
              name: 'settings',
              weight: 400,
            }),
          }),
        }}
      />
    </Tab.Navigator>
  );
}

export default function HomeTabNavigator() {
  return <HomeTabNavigatorInner />;
}
