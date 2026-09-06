import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../assets/styles/home.styles';
import { COLORS } from '../constants/colors';
import { getCategoryIcon } from '../constants/categories';

const TransactionItem = ({ item, onDelete }) => {
  const isExpense = parseFloat(item.amount) < 0;
  const sign = isExpense ? '-' : '+';

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(item.id),
        },
      ]
    );
  };

  return (
    <View style={styles.transactionCard}>
      <View style={styles.transactionContent}>
        <View style={styles.categoryIconContainer}>
          <Ionicons
            name={getCategoryIcon(item.category)}
            size={20}
            color={isExpense ? COLORS.expense : COLORS.income}
          />
        </View>
        <View style={styles.transactionLeft}>
          <Text style={styles.transactionTitle}>{item.title}</Text>
          <Text style={styles.transactionCategory}>{item.category}</Text>
        </View>
        <View style={styles.transactionRight}>
          <Text
            style={[
              styles.transactionAmount,
              { color: isExpense ? COLORS.expense : COLORS.income },
            ]}
          >
            {sign}${Math.abs(parseFloat(item.amount)).toFixed(2)}
          </Text>
          <Text style={styles.transactionDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={20} color={COLORS.expense} />
      </TouchableOpacity>
    </View>
  );
};

export default TransactionItem;
