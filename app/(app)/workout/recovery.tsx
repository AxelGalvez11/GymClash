import { Redirect } from 'expo-router';

// Active Recovery has been removed. Redirect to home.
export default function RecoveryRedirect() {
  return <Redirect href="/(app)/home" />;
}
