import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CampaignsScreen } from '../screens/CampaignsScreen';
import { CampaignDetailScreen } from '../screens/CampaignDetailScreen';
import { BoostDetailScreen } from '../screens/BoostDetailScreen';
import { MyCampaignsScreen } from '../screens/MyCampaignsScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SubmissionDetailScreen } from '../screens/SubmissionDetailScreen';
import { LiquidGlassTabBar } from '../components/LiquidGlassTabBar';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <LiquidGlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Discover" component={CampaignsScreen} />
      <Tab.Screen name="MyCampaigns" component={MyCampaignsScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen
        name="CampaignDetail"
        component={CampaignDetailScreen}
        options={{
          animation: 'slide_from_bottom',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="BoostDetail"
        component={BoostDetailScreen}
        options={{
          animation: 'slide_from_bottom',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          animation: 'slide_from_bottom',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="SubmissionDetail"
        component={SubmissionDetailScreen}
        options={{
          animation: 'slide_from_bottom',
          presentation: 'card',
        }}
      />
    </Stack.Navigator>
  );
}
