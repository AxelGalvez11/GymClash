import { Redirect } from 'expo-router';

// Root index — immediately hands off to the auth group.
// AuthGate in _layout.tsx will redirect to (app)/home if a session exists.
export default function Index() {
  return <Redirect href="/(auth)/landing" />;
}
