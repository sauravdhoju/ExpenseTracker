import { useClerk } from '@clerk/clerk-expo';
import { Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../assets/styles/home.styles.js';
import { COLORS } from '../constants/colors.js';
import { router } from 'expo-router';

export const SignOutButton = () => {
  const { signOut } = useClerk();

  const handleSignOut = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/sign-in'); // 👈 Redirect user after logout
        },
      },
    ]);
  };

  return (
    <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
      <Ionicons name="log-out-outline" size={22} color={COLORS.text} />
    </TouchableOpacity>
  );
};
