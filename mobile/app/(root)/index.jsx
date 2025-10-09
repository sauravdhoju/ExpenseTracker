import { SignedIn, SignedOut, useUser } from '@clerk/clerk-expo';
import { Link, router, useRouter } from 'expo-router';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { SignOutButton } from '@/components/SignOutButton';
import { useTransactions } from '../../hooks/useTransaction.js';
import { useEffect } from 'react';
import PageLoader from '../../components/PageLoader.jsx';
import { styles } from '../../assets/styles/home.styles.js';
import { Ionicons } from '@expo/vector-icons';
import BalanceCard from '../../components/BalanceCard.jsx';

export default function Page() {
  const { user } = useUser();
  const router = useRouter();

  const { transaction, summary, isLoading, loadData, deleteTransaction } =
    useTransactions(user.id);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) return <PageLoader />;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          {/* Left  */}
          <View style={styles.headerLeft}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>Welcome,</Text>
              <Text style={styles.usernameText}>
                {user?.emailAddresses[0]?.emailAddress.split('@')[0]}
              </Text>
            </View>
          </View>

          {/* Right */}
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/create')}
            >
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
            <SignOutButton />
          </View>
        </View>
        <BalanceCard summary={summary} />
      </View>
    </View>
  );
}
