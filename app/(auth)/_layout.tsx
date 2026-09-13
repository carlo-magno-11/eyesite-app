import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';

export default function AuthLayout() {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <Stack 
        screenOptions={{ 
          headerShown: false, 
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: 'white' },
          animationDuration: 250
        }}
      >
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="register" />
        <Stack.Screen name="create-profile" options={{ gestureEnabled: false }} />
      </Stack>
    </>
  );
}