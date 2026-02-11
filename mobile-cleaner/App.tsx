// mobile-cleaner/App.tsx
import * as React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./src/screens/LoginScreen";
import JobsScreen from "./src/screens/JobsScreen";
import JobDetailsScreen from "./src/screens/JobDetailsScreen";
import { loadStoredToken } from "./src/api/client";

export type RootStackParamList = {
  Login: undefined;
  Jobs: undefined;
  JobDetails: { jobId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [authReady, setAuthReady] = React.useState(false);
  const [hasToken, setHasToken] = React.useState(false);

  React.useEffect(() => {
    loadStoredToken().then((token) => {
      setHasToken(!!token);
      setAuthReady(true);
    });
  }, []);

  // Render nothing until we know whether a stored token exists.
  // This prevents a flash of the Login screen on an already-authenticated device.
  if (!authReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={hasToken ? "Jobs" : "Login"}
        screenOptions={{
          headerTitleAlign: "center",
        }}
      >
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
