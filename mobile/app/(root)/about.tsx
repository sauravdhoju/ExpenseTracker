import { useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { spacing, radius } from '../../src/constants/theme';
import Card from '../../src/components/ui/Card';
import {
  APP_INFO,
  BUILT_WITH,
  DEVELOPER,
  FAQ,
  FEATURES,
  PRINCIPLES,
} from '../../src/constants/appInfo';

function SectionTitle({ children }: { children: string }) {
  const colors = useThemeColors();
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: '700',
        color: colors.textLight,
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
      }}
    >
      {children}
    </Text>
  );
}

async function openMail(subject: string, body = '') {
  const url = `mailto:${DEVELOPER.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('No email app found', `You can write to ${DEVELOPER.email}.`);
  }
}

export default function AboutScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const deviceInfo = `\n\n---\n${APP_INFO.name} ${APP_INFO.version} · ${Platform.OS} ${Platform.Version}`;

  const links: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
  }[] = [
    {
      icon: 'shield-checkmark-outline',
      label: 'Privacy',
      onPress: () => router.push('/settings/privacy'),
    },
    // {
    //   icon: 'chatbubble-ellipses-outline',
    //   label: 'Send feedback',
    //   onPress: () => openMail(`${APP_INFO.name} feedback`, deviceInfo),
    // },
    // {
    //   icon: 'bug-outline',
    //   label: 'Report a problem',
    //   onPress: () =>
    //     openMail(
    //       `${APP_INFO.name} bug report`,
    //       `What happened?\n\nSteps to reproduce:\n${deviceInfo}`
    //     ),
    // },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: spacing.lg,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>
          About
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingTop: 0,
          paddingBottom: 130,
        }}
      >
        {/* App */}
        <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={{
              width: 84,
              height: 84,
              borderRadius: 22,
              marginBottom: spacing.md,
            }}
          />
          <Text
            style={{
              fontSize: 26,
              fontWeight: '800',
              color: colors.text,
              letterSpacing: -0.4,
            }}
          >
            {APP_INFO.name}
          </Text>
          <Text
            style={{
              fontSize: 13.5,
              color: colors.primary,
              fontWeight: '600',
              marginTop: 4,
            }}
          >
            {APP_INFO.tagline}
          </Text>
          <View
            style={{
              marginTop: spacing.sm,
              paddingVertical: 3,
              paddingHorizontal: 10,
              borderRadius: radius.full,
              backgroundColor: colors.card,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: colors.textLight,
                fontWeight: '600',
              }}
            >
              Version {APP_INFO.version}
            </Text>
          </View>
        </View>

        <Card>
          <Text style={{ fontSize: 14, color: colors.text, lineHeight: 21 }}>
            {APP_INFO.description}
          </Text>
        </Card>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.md,
            marginTop: spacing.md,
          }}
        >
          {PRINCIPLES.map((p) => (
            <Card
              key={p.title}
              style={{ flexBasis: '47%', flexGrow: 1, padding: spacing.md }}
            >
              <Ionicons name={p.icon as any} size={20} color={colors.primary} />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: colors.text,
                  marginTop: spacing.sm,
                }}
              >
                {p.title}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textLight,
                  marginTop: 2,
                  lineHeight: 17,
                }}
              >
                {p.text}
              </Text>
            </Card>
          ))}
        </View>

        {/* Developer */}
        <SectionTitle>Developer</SectionTitle>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{ color: colors.white, fontSize: 19, fontWeight: '800' }}
              >
                {DEVELOPER.initials}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text
                style={{ fontSize: 17, fontWeight: '700', color: colors.text }}
              >
                {DEVELOPER.name}
              </Text>
              <Text
                style={{ fontSize: 13, color: colors.textLight, marginTop: 1 }}
              >
                {DEVELOPER.role}
              </Text>
            </View>
          </View>
          <Text
            style={{
              fontSize: 13.5,
              color: colors.text,
              lineHeight: 20,
              marginTop: spacing.md,
            }}
          >
            {DEVELOPER.bio}
          </Text>
          <TouchableOpacity
            onPress={() => openMail(`Hello from ${APP_INFO.name}`)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: spacing.md,
              paddingVertical: spacing.sm + 2,
              paddingHorizontal: spacing.md,
              borderRadius: radius.md,
              backgroundColor: colors.background,
            }}
          >
            <Ionicons name="mail-outline" size={18} color={colors.primary} />
            <Text
              style={{
                flex: 1,
                marginLeft: spacing.sm,
                fontSize: 14,
                color: colors.text,
              }}
            >
              {DEVELOPER.email}
            </Text>
            <Ionicons name="open-outline" size={15} color={colors.textLight} />
          </TouchableOpacity>
        </Card>

        {/* Features */}
        <SectionTitle>What ETracko does</SectionTitle>
        <Card>
          {FEATURES.map((f, i) => (
            <View
              key={f}
              style={{
                flexDirection: 'row',
                marginBottom: i === FEATURES.length - 1 ? 0 : spacing.sm,
              }}
            >
              <Ionicons
                name="checkmark-circle"
                size={17}
                color={colors.income}
                style={{ marginTop: 1 }}
              />
              <Text
                style={{
                  flex: 1,
                  marginLeft: spacing.sm,
                  fontSize: 13.5,
                  color: colors.text,
                  lineHeight: 19,
                }}
              >
                {f}
              </Text>
            </View>
          ))}
        </Card>

        {/* FAQ */}
        <SectionTitle>Help & FAQ</SectionTitle>
        <Card style={{ padding: 0 }}>
          {FAQ.map((item, i) => {
            const open = openFaq === i;
            return (
              <TouchableOpacity
                key={item.q}
                onPress={() => setOpenFaq(open ? null : i)}
                activeOpacity={0.7}
                style={{
                  padding: spacing.lg,
                  borderBottomWidth: i === FAQ.length - 1 ? 0 : 1,
                  borderBottomColor: colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      fontWeight: '600',
                      color: colors.text,
                    }}
                  >
                    {item.q}
                  </Text>
                  <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={17}
                    color={colors.textLight}
                  />
                </View>
                {open && (
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.textLight,
                      lineHeight: 19,
                      marginTop: spacing.sm,
                    }}
                  >
                    {item.a}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </Card>

        {/* Links */}
        <SectionTitle>Support</SectionTitle>
        <Card style={{ padding: 0 }}>
          {links.map((l, i) => (
            <TouchableOpacity
              key={l.label}
              onPress={l.onPress}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: spacing.lg,
                borderBottomWidth: i === links.length - 1 ? 0 : 1,
                borderBottomColor: colors.border,
              }}
            >
              <Ionicons
                name={l.icon}
                size={19}
                color={colors.text}
                style={{ width: 26 }}
              />
              <Text
                style={{
                  flex: 1,
                  marginLeft: spacing.sm,
                  fontSize: 15,
                  color: colors.text,
                }}
              >
                {l.label}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={17}
                color={colors.textLight}
              />
            </TouchableOpacity>
          ))}
        </Card>

        {/* Footer */}
        <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
          <Text style={{ fontSize: 12, color: colors.textLight }}>
            Built with {BUILT_WITH.join(' · ')}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 4 }}>
            © {new Date().getFullYear()} {DEVELOPER.name}. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
