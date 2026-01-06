import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, Alert, Modal, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useAuth } from "@/lib/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Spacing, BorderRadius } from "@/constants/theme";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const LEGAL_URL = "https://1betterwithunits.info/";

type AuthMode = "signin" | "signup";
type ScreenRouteProp = RouteProp<RootStackParamList, "Auth">;

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<ScreenRouteProp>();
  const { signIn, signUp } = useAuth();
  
  const fromPaywall = route.params?.fromPaywall ?? false;
  const signInOnly = route.params?.signInOnly ?? false;
  
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const validateForm = (): boolean => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Information", "Please enter your email and password.");
      return false;
    }

    if (mode === "signup") {
      if (password !== confirmPassword) {
        Alert.alert("Password Mismatch", "Passwords do not match.");
        return false;
      }
      if (password.length < 6) {
        Alert.alert("Weak Password", "Password must be at least 6 characters.");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (mode === "signup") {
      setShowTermsModal(true);
      return;
    }

    await performAuth();
  };

  const performAuth = async () => {
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await signUp(email.trim(), password);
        if (error) {
          Alert.alert("Error", error.message);
        } else {
          Alert.alert(
            "Account Created",
            "Your account has been created. You are now signed in.",
            [{ text: "OK", onPress: () => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }}]
          );
        }
      } else {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          if (error.message.toLowerCase().includes("email not confirmed")) {
            Alert.alert(
              "Email Not Confirmed",
              "Your email address has not been confirmed. Please ask the developer to disable email confirmation in Supabase, or check your email for a confirmation link."
            );
          } else {
            Alert.alert("Error", error.message);
          }
        } else {
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }
      }
    } catch (err: unknown) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAgreeToTerms = async () => {
    setShowTermsModal(false);
    await performAuth();
  };

  const handleCancelTerms = () => {
    setShowTermsModal(false);
  };

  const openTermsOfService = () => {
    Linking.openURL(LEGAL_URL);
  };

  const openPrivacyPolicy = () => {
    Linking.openURL(LEGAL_URL);
  };

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setConfirmPassword("");
  };

  return (
    <LinearGradient
      colors={["#667eea", "#764ba2"]}
      style={styles.container}
    >
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <View style={styles.iconContainer}>
            <Feather name="layers" size={48} color="#FFFFFF" />
          </View>
          <ThemedText type="h1" style={styles.title}>1% Better</ThemedText>
          <ThemedText type="small" style={styles.tagline}>with Units</ThemedText>
          <ThemedText type="body" style={styles.subtitle}>
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </ThemedText>
          <ThemedText type="small" style={styles.paidAppNotice}>
            Active subscription required for account access
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(200)} style={styles.form}>
          <View style={styles.inputContainer}>
            <Feather name="mail" size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              spellCheck={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Feather name="lock" size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={20} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>

          {mode === "signup" ? (
            <Animated.View entering={FadeInDown} style={styles.inputContainer}>
              <Feather name="lock" size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </Animated.View>
          ) : null}

          <Button
            onPress={handleSubmit}
            disabled={loading}
            variant="light"
            style={styles.submitButton}
          >
            {loading ? "Please wait..." : mode === "signup" ? "Create Account" : "Sign In"}
          </Button>

          {!signInOnly ? (
            <Pressable onPress={toggleMode} style={styles.toggleButton}>
              <ThemedText type="body" style={styles.toggleText}>
                {mode === "signup" ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
              </ThemedText>
            </Pressable>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300)} style={styles.footer}>
          <ThemedText type="small" style={styles.footerText}>
            By continuing, you agree to our{" "}
            <ThemedText type="small" style={styles.linkText} onPress={openTermsOfService}>
              Terms of Service
            </ThemedText>
            {" "}and{" "}
            <ThemedText type="small" style={styles.linkText} onPress={openPrivacyPolicy}>
              Privacy Policy
            </ThemedText>
          </ThemedText>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>

      <Modal
        visible={showTermsModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelTerms}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText type="h3" style={styles.modalTitle}>
              Terms Agreement
            </ThemedText>
            <ThemedText type="body" style={styles.modalText}>
              By creating an account, you agree to our:
            </ThemedText>
            
            <View style={styles.modalLinks}>
              <Pressable onPress={openTermsOfService} style={styles.modalLinkRow}>
                <Feather name="file-text" size={18} color="#667eea" />
                <ThemedText type="body" style={styles.modalLinkText}>
                  Terms of Service
                </ThemedText>
                <Feather name="external-link" size={16} color="#667eea" />
              </Pressable>
              
              <Pressable onPress={openPrivacyPolicy} style={styles.modalLinkRow}>
                <Feather name="shield" size={18} color="#667eea" />
                <ThemedText type="body" style={styles.modalLinkText}>
                  Privacy Policy
                </ThemedText>
                <Feather name="external-link" size={16} color="#667eea" />
              </Pressable>
            </View>

            <View style={styles.modalButtons}>
              <Pressable onPress={handleCancelTerms} style={styles.cancelButton}>
                <ThemedText type="body" style={styles.cancelButtonText}>
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable onPress={handleAgreeToTerms} style={styles.agreeButton}>
                <ThemedText type="body" style={styles.agreeButtonText}>
                  I Agree
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: Spacing.sm,
  },
  tagline: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: Spacing.md,
  },
  subtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 18,
  },
  paidAppNotice: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: Spacing.sm,
    fontStyle: "italic",
  },
  form: {
    gap: Spacing.md,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 56,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    height: "100%",
  },
  eyeButton: {
    padding: Spacing.sm,
  },
  submitButton: {
    marginTop: Spacing.md,
    height: 56,
  },
  toggleButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  toggleText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
  },
  footer: {
    marginTop: Spacing["2xl"],
    alignItems: "center",
  },
  footerText: {
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 20,
  },
  linkText: {
    color: "rgba(255,255,255,0.9)",
    textDecorationLine: "underline",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: "100%",
    maxWidth: 340,
  },
  modalTitle: {
    color: "#1a1a2e",
    textAlign: "center",
    marginBottom: Spacing.md,
    fontWeight: "700",
  },
  modalText: {
    color: "#444",
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  modalLinks: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  modalLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f4ff",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  modalLinkText: {
    flex: 1,
    color: "#667eea",
    fontWeight: "600",
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: "#e0e0e0",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
  },
  agreeButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: "#667eea",
    alignItems: "center",
  },
  agreeButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
