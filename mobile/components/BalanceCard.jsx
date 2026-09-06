import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../assets/styles/home.styles';
import { COLORS } from '../constants/colors';

const BalanceCard = ({ summary }) => {
  const balance = parseFloat(summary.balance) || 0;

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.income]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.balanceCard}
    >
      <Text style={[styles.balanceTitle, { color: 'rgba(255,255,255,0.85)' }]}>
        Total Balance
      </Text>
      <Text style={[styles.balanceAmount, { color: COLORS.white }]}>
        ${balance.toFixed(2)}
      </Text>
      <View style={styles.balanceStats}>
        <View style={styles.balanceStatItem}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="arrow-up-circle" size={14} color="#FFF" />
            <Text
              style={[styles.balanceStatLabel, { color: 'rgba(255,255,255,0.85)' }]}
            >
              Income
            </Text>
          </View>
          <Text style={[styles.balanceStatAmount, { color: COLORS.white }]}>
            ${parseFloat(summary.income).toFixed(2)}
          </Text>
        </View>
        <View
          style={[
            styles.balanceStatItem,
            styles.statDivider,
            { borderColor: 'rgba(255,255,255,0.3)' },
          ]}
        />
        <View style={styles.balanceStatItem}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="arrow-down-circle" size={14} color="#FFF" />
            <Text
              style={[styles.balanceStatLabel, { color: 'rgba(255,255,255,0.85)' }]}
            >
              Expenses
            </Text>
          </View>
          <Text style={[styles.balanceStatAmount, { color: COLORS.white }]}>
            ${Math.abs(parseFloat(summary.expenses)).toFixed(2)}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
};

export default BalanceCard;
