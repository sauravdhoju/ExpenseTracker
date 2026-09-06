import { useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../../assets/styles/create.styles';
import { COLORS } from '../../constants/colors';
import { CATEGORIES } from '../../constants/categories';
import { useTransactions } from '../../hooks/useTransaction';

export default function CreateTransaction() {
  const { createTransaction } = useTransactions();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isValid =
    title.trim().length > 0 && parseFloat(amount) > 0 && category.length > 0;

  const handleSave = async () => {
    if (!isValid || isSaving) return;

    setIsSaving(true);
    const parsedAmount = Math.abs(parseFloat(amount));
    const signedAmount = type === 'expense' ? -parsedAmount : parsedAmount;

    const success = await createTransaction({
      title: title.trim(),
      amount: signedAmount,
      category,
    });

    setIsSaving(false);
    if (success) router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Transaction</Text>
        <TouchableOpacity
          style={styles.saveButtonContainer}
          onPress={handleSave}
          disabled={!isValid || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text
              style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
            >
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              type === 'expense' && styles.typeButtonActive,
            ]}
            onPress={() => setType('expense')}
          >
            <Ionicons
              name="arrow-down-circle"
              size={20}
              color={type === 'expense' ? COLORS.white : COLORS.text}
              style={styles.typeIcon}
            />
            <Text
              style={[
                styles.typeButtonText,
                type === 'expense' && styles.typeButtonTextActive,
              ]}
            >
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              type === 'income' && styles.typeButtonActive,
            ]}
            onPress={() => setType('income')}
          >
            <Ionicons
              name="arrow-up-circle"
              size={20}
              color={type === 'income' ? COLORS.white : COLORS.text}
              style={styles.typeIcon}
            />
            <Text
              style={[
                styles.typeButtonText,
                type === 'income' && styles.typeButtonTextActive,
              ]}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor={COLORS.textLight}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons
            name="create-outline"
            size={22}
            color={COLORS.textLight}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Transaction title"
            placeholderTextColor={COLORS.textLight}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <Text style={styles.sectionTitle}>
          <Ionicons name="pricetag-outline" size={16} color={COLORS.text} />{' '}
          Category
        </Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.name}
              style={[
                styles.categoryButton,
                category === cat.name && styles.categoryButtonActive,
              ]}
              onPress={() => setCategory(cat.name)}
            >
              <Ionicons
                name={cat.icon}
                size={16}
                color={category === cat.name ? COLORS.white : COLORS.text}
                style={styles.categoryIcon}
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  category === cat.name && styles.categoryButtonTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}
