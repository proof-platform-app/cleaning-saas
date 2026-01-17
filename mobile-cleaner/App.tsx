// mobile-cleaner/App.tsx

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./src/screens/LoginScreen";
import JobsScreen from "./src/screens/JobsScreen";
import JobDetailsScreen from "./src/screens/JobDetailsScreen";

export type RootStackParamList = {
  Login: undefined;
  Jobs: undefined;
  JobDetails: { jobId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: "Login" }}
        />

        <Stack.Screen
          name="Jobs"
          component={JobsScreen}
          options={{ title: "Today Jobs" }}
        />

        <Stack.Screen
          name="JobDetails"
          component={JobDetailsScreen}
          options={{ title: "Job Details" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
