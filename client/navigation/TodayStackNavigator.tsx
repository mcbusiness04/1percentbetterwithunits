import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TodayScreen from "@/screens/TodayScreen";
import HabitDetailScreen from "@/screens/HabitDetailScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type TodayStackParamList = {
  Today: undefined;
  HabitDetail: { habitId: string };
};

const Stack = createNativeStackNavigator<TodayStackParamList>();

export default function TodayStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Today"
        component={TodayScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Units" />,
        }}
      />
      <Stack.Screen
        name="HabitDetail"
        component={HabitDetailScreen}
        options={({ route }) => ({
          headerTitle: "",
        })}
      />
    </Stack.Navigator>
  );
}
