import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useAuth } from "@/lib/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Spacing, BorderRadius } from "@/constants/theme";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

type AuthMode = "signin" | "signup";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Information", "Please enter your email and password.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }

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
          <ThemedText type="h1" style={styles.title}>Units</ThemedText>
          <ThemedText type="small" style={styles.tagline}>1% better with Units</ThemedText>
          <ThemedText type="body" style={styles.subtitle}>
            {mode === "signup" ? "Create your account" : "Welcome back"}
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

          <Pressable onPress={toggleMode} style={styles.toggleButton}>
            <ThemedText type="body" style={styles.toggleText}>
              {mode === "signup" ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </ThemedText>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300)} style={styles.footer}>
          <ThemedText type="small" style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </ThemedText>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>
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
});
