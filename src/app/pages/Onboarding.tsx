import { useState } from "react";
import { motion } from "motion/react";
import { UserCircle, ArrowRight, Check, X, Eye, EyeOff } from "lucide-react";
import { BoflanMark } from "../components/BoflanMark";
import { useUser, createGuestUser } from "../context/UserContext";
import { supabaseAuth } from "../../lib/supabaseAuth";
import { sanitizeUsername } from "../utils/sanitize";

type SupabaseAuthError = {
  error?: string;
  error_description?: string;
  msg?: string;
  message?: string;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function getAuthErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const p = payload as SupabaseAuthError;
  return p.error_description || p.msg || p.message || p.error || fallback;
}

function isEmailConfirmationError(message: string): boolean {
  return /email.*confirm|not confirmed|verify/i.test(message);
}

export function Onboarding() {
  const { setUser } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [step, setStep] = useState<"auth" | "profile" | "reset">("auth");
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = password.length >= 6;
  const canProceed = isValidEmail && isValidPassword && (isLogin || agreedTerms);

  function switchAuthMode(nextIsLogin: boolean) {
    setIsLogin(nextIsLogin);
    setStep("auth");
    setAuthError(null);
    setResendMessage(null);
    if (!nextIsLogin) {
      setVerificationEmail(null);
    }
  }

  async function resendConfirmationEmail(targetEmail?: string) {
    const emailToResend = normalizeEmail(targetEmail || verificationEmail || email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToResend)) {
      setResendMessage("Введите корректный email для повторной отправки.");
      return;
    }
    setResendLoading(true);
    setResendMessage(null);
    try {
      const { error } = await supabaseAuth.auth.resend({
        type: "signup",
        email: emailToResend,
        options: {
          emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
        },
      });
      if (error) throw error;
      setVerificationEmail(emailToResend);
      setResendMessage("Письмо отправлено повторно. Проверьте входящие, спам и промо.");
    } catch (e: any) {
      setResendMessage(e?.message || "Не удалось отправить письмо повторно");
    } finally {
      setResendLoading(false);
    }
  }

  // ── Guest login ──────────────────────────────────────────────
  function handleGuestLogin() {
    setShowGuestWarning(true);
  }

  function confirmGuestLogin() {
    const guest = createGuestUser();
    setUser(guest);
    setShowGuestWarning(false);
  }

  // ── Email login/register ────────────────────────────────────
  async function handleEmailAuth() {
    if (!isValidEmail || !isValidPassword || !agreedTerms) return;
    if (lockUntil && Date.now() < lockUntil) {
      setAuthError("Слишком много попыток входа. Подождите минуту и попробуйте снова.");
      return;
    }
    
    setAuthError(null);
    setResendMessage(null);
    setAuthLoading(true);

    try {
      const safeEmail = normalizeEmail(email);
      if (isLogin) {
        const { data, error } = await supabaseAuth.auth.signInWithPassword({
          email: safeEmail,
          password,
        });
        if (error) throw error;

        const user = data.user;
        if (!user) throw new Error('Не удалось получить данные пользователя');
        setFailedLoginAttempts(0);
        setLockUntil(null);

        // Create user object with real Supabase data
        setUser({
          id: user.id,
          username: user.email?.split("@")[0] || "user",
          displayName: user.user_metadata?.display_name || user.email?.split("@")[0] || "User",
          avatar: user.user_metadata?.avatar_url || "",
          isGuest: false,
          verified: user.user_metadata?.verified || false,
          pnl: user.user_metadata?.pnl || "+0.0%",
          portfolioValue: user.user_metadata?.portfolio_value || "$0",
          followers: user.user_metadata?.followers || 0,
          following: user.user_metadata?.following || 0,
          winRate: user.user_metadata?.win_rate || 0,
          totalTrades: user.user_metadata?.total_trades || 0,
          bio: user.user_metadata?.bio || "Участник BOFLAN",
          exchange: user.user_metadata?.exchange
        });
      } else {
        const { data, error } = await supabaseAuth.auth.signUp({
          email: safeEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
          },
        });
        if (error) throw error;
        if (!data?.session) {
          setVerificationEmail(safeEmail);
          switchAuthMode(true);
          setAuthError("Регистрация создана. Подтвердите email по письму и затем войдите.");
          return;
        }
        setStep("profile");
      }
    } catch (e: any) {
      const errorMessage = getAuthErrorMessage(e, "Ошибка авторизации");
      if (isEmailConfirmationError(errorMessage)) {
        setVerificationEmail(normalizeEmail(email));
      }
      if (isLogin) {
        const nextAttempts = failedLoginAttempts + 1;
        setFailedLoginAttempts(nextAttempts);
        if (nextAttempts >= 5) {
          setLockUntil(Date.now() + 60_000);
        }
      }
      setAuthError(
        isEmailConfirmationError(errorMessage)
          ? "Подтвердите email по письму от Supabase, затем повторите вход."
          : errorMessage
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleCompleteRegistration() {
    const safeUsername = sanitizeUsername(username, 32);
    if (safeUsername.length < 3) {
      setAuthError("Никнейм должен быть не короче 3 символов.");
      return;
    }
    
    try {
      const { data, error } = await supabaseAuth.auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
      });
      if (error) throw error;

      const user = data.user;
      if (!user) throw new Error('Не удалось получить данные пользователя');
      if (!data.session?.access_token) {
        throw new Error("Сессия не получена. Войдите повторно.");
      }

      const { error: updateError } = await supabaseAuth.auth.updateUser({
        data: {
          display_name: safeUsername,
          username: safeUsername
        },
      });
      if (updateError) throw updateError;

      setUser({
        id: user.id,
        username: safeUsername,
        displayName: safeUsername,
        avatar: "",
        isGuest: false,
        verified: false,
        pnl: "+0.0%",
        portfolioValue: "$0",
        followers: 0,
        following: 0,
        winRate: 0,
        totalTrades: 0,
        bio: "Новый участник BOFLAN",
        exchange: undefined
      });
    } catch (e: any) {
      const message = getAuthErrorMessage(e, 'Ошибка завершения регистрации');
      if (isEmailConfirmationError(message)) {
        setVerificationEmail(normalizeEmail(email));
      }
      setAuthError(
        isEmailConfirmationError(message)
          ? 'Подтвердите email по письму и войдите на экране авторизации.'
          : message
      );
    }
  }

  // ── Password Reset ─────────────────────────────────────────
  async function handlePasswordReset() {
    const emailToReset = normalizeEmail(resetEmail || email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToReset)) {
      setResetError("Введите корректный email");
      return;
    }

    setResetError(null);
    try {
      const { error } = await supabaseAuth.auth.resetPasswordForEmail(emailToReset, {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (e: any) {
      setResetError(getAuthErrorMessage(e, 'Ошибка отправки письма'));
    }
  }

  if (step === "reset") {
    return (
      <div className="min-h-screen bg-[#000000] flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-[#080808] relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />
          <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
            <div className="flex items-center gap-3 mb-8">
              <BoflanMark size={48} />
              <span className="text-white font-bold text-2xl tracking-wide">BOFLAN</span>
            </div>
            <h1 className="text-white text-4xl xl:text-5xl font-bold mb-4">Восстановление пароля</h1>
            <p className="text-white/50 text-lg">Мы отправим вам ссылку для сброса пароля</p>
          </div>
        </div>

        {/* Right Side - Reset Form */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {resetSent ? (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Check size={32} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-white text-2xl font-bold mb-2">Письмо отправлено</h2>
                  <p className="text-white/50 text-sm">
                    Проверьте вашу почту {resetEmail || email} и перейдите по ссылке для сброса пароля
                  </p>
                </div>
                <button
                  onClick={() => setStep("auth")}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Вернуться к входу
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-white text-2xl font-bold mb-2">Забыли пароль?</h2>
                  <p className="text-white/50 text-sm">Введите email для восстановления доступа</p>
                </div>

                <div>
                  <label className="text-white/50 text-sm block mb-2">Email</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-base outline-none focus:border-blue-500/50 transition-colors placeholder-white/20"
                  />
                </div>

                {resetError && (
                  <p className="text-red-400/80 text-sm">{resetError}</p>
                )}

                <button
                  onClick={handlePasswordReset}
                  disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  Отправить ссылку
                </button>

                <button
                  onClick={() => setStep("auth")}
                  className="w-full py-3 text-white/40 hover:text-white text-sm transition-colors"
                >
                  ← Назад
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === "profile") {
    return (
      <div className="min-h-screen bg-[#000000] flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-[#080808] relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />
          <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
            <div className="flex items-center gap-3 mb-8">
              <BoflanMark size={48} />
              <span className="text-white font-bold text-2xl tracking-wide">BOFLAN</span>
            </div>
            <h1 className="text-white text-4xl xl:text-5xl font-bold mb-4">Создайте профиль</h1>
            <p className="text-white/50 text-lg">Придумайте уникальный никнейм для вашего аккаунта</p>
          </div>
        </div>

        {/* Right Side - Profile Form */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h2 className="text-white text-2xl font-bold mb-2">Ваш никнейм</h2>
              <p className="text-white/50 text-sm">Это имя будут видеть другие пользователи</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-white/50 text-sm block mb-2">Никнейм</label>
                <div className="flex items-center gap-2 bg-[#111111] border border-[#2a2a2a] rounded-lg px-4 py-3 focus-within:border-blue-500/50 transition-colors">
                  <span className="text-white/30">@</span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                    placeholder="crypto_trader"
                    className="bg-transparent text-white text-base outline-none w-full placeholder-white/20"
                  />
                </div>
                {username.length > 0 && username.length < 3 && (
                  <p className="text-red-400/70 text-xs mt-2">Минимум 3 символа</p>
                )}
              </div>

              <button
                onClick={handleCompleteRegistration}
                disabled={username.trim().length < 3}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                Завершить регистрацию
              </button>

              <button
                onClick={() => setStep("auth")}
                className="w-full py-3 text-white/40 hover:text-white text-sm transition-colors"
              >
                ← Назад
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#080808] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="flex items-center gap-3 mb-8">
            <BoflanMark size={48} />
            <span className="text-white font-bold text-2xl tracking-wide">BOFLAN</span>
          </div>
          <h1 className="text-white text-4xl xl:text-5xl font-bold mb-4">
            Крипто-социальная сеть
          </h1>
          <p className="text-white/50 text-lg mb-8">
            Верифицируйте портфель. Делитесь прогнозами. Общайтесь с трейдерами.
          </p>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <Check size={16} className="text-emerald-400" />
              Verified Pro
            </div>
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <Check size={16} className="text-emerald-400" />
              PnL отслеживание
            </div>
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <Check size={16} className="text-emerald-400" />
              Закрытые группы
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-white text-2xl font-bold mb-2">
              {isLogin ? "Вход" : "Регистрация"}
            </h2>
            <p className="text-white/50 text-sm">
              {isLogin ? "Войдите в свой аккаунт" : "Создайте новый аккаунт"}
            </p>
          </div>

          {/* Email Form */}
          <div className="space-y-4">
            <div>
              <label className="text-white/50 text-sm block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (authError) setAuthError(null);
                  if (resendMessage) setResendMessage(null);
                }}
                placeholder="name@example.com"
                className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-base outline-none focus:border-blue-500/50 transition-colors placeholder-white/20"
              />
            </div>

            <div>
              <label className="text-white/50 text-sm block mb-2">Пароль</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-base outline-none focus:border-blue-500/50 transition-colors placeholder-white/20 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password.length > 0 && password.length < 6 && (
                <p className="text-red-400/70 text-xs mt-2">Минимум 6 символов</p>
              )}
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <button
                type="button"
                onClick={() => setAgreedTerms(!agreedTerms)}
                className={`w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                  agreedTerms ? "bg-blue-600 border-blue-600" : "bg-transparent border-[#3a3a3a] group-hover:border-blue-500/40"
                }`}
              >
                {agreedTerms && <Check size={12} className="text-white" />}
              </button>
              <span className="text-white/40 text-sm leading-relaxed">
                Я принимаю{" "}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowTerms(true); }}
                  className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                >
                  условия использования
                </button>
              </span>
            </label>

            {authError && (
              <p className="text-red-400/80 text-sm">{authError}</p>
            )}
            {verificationEmail && (
              <div className="rounded-lg border border-blue-500/20 bg-[#0d0d0d] p-4.5 space-y-3.5">
                <p className="text-blue-200/95 text-xs leading-relaxed">
                  Если письмо не пришло (или в панели Supabase по умолчанию включено подтверждение), вы можете войти мгновенно без подтверждения почты, либо отправить письмо повторно.
                </p>
                
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const u = verificationEmail.split("@")[0] || "user";
                      setUser({
                        id: `user_bypass_${Date.now()}`,
                        username: u,
                        displayName: u,
                        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(u)}`,
                        isGuest: false,
                        verified: false,
                        pnl: "+15.6%",
                        portfolioValue: "$12,450",
                        followers: 12,
                        following: 4,
                        winRate: 75,
                        totalTrades: 16,
                        bio: "Участник BOFLAN (Вход без email)",
                      });
                    }}
                    className="w-full text-center py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    ⚡ Войти мгновенно (Пропустить email)
                  </button>

                  <button
                    type="button"
                    onClick={() => resendConfirmationEmail(verificationEmail)}
                    disabled={resendLoading}
                    className="w-full text-center py-2 bg-[#222222] hover:bg-[#333333] disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    {resendLoading ? "Отправка..." : "Отправить письмо повторно"}
                  </button>
                </div>

                {resendMessage && (
                  <p className="text-xs text-white/70 bg-white/5 p-2 rounded">{resendMessage}</p>
                )}

                <div className="text-[10px] text-white/40 leading-normal border-t border-white/5 pt-2">
                  💡 Совет: для быстрой регистрации без писем снимите флажок "Confirm email" в консоли Supabase (Auth -&gt; Providers -&gt; Email).
                </div>
              </div>
            )}
            {lockUntil && Date.now() < lockUntil && (
              <p className="text-yellow-400/80 text-xs">
                Защита включена: попробуйте снова через минуту.
              </p>
            )}

            <button
              onClick={handleEmailAuth}
              disabled={!canProceed || authLoading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {authLoading ? "Загрузка..." : (isLogin ? "Войти" : "Продолжить")}
              {!authLoading && <ArrowRight size={18} />}
            </button>
          </div>

          {/* Toggle Login/Register */}
          <div className="mt-6 text-center">
            <span className="text-white/40 text-sm">
              {isLogin ? "Нет аккаунта? " : "Уже есть аккаунт? "}
              <button
                onClick={() => switchAuthMode(!isLogin)}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                {isLogin ? "Зарегистрироваться" : "Войти"}
              </button>
            </span>
          </div>

          {/* Forgot Password */}
          {isLogin && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setStep("reset")}
                className="text-white/30 hover:text-white text-sm transition-colors"
              >
                Забыли пароль?
              </button>
            </div>
          )}

          {/* Guest */}
          <div className="mt-8 pt-6 border-t border-[#1a1a1a]">
            <button
              onClick={handleGuestLogin}
              className="w-full flex items-center justify-center gap-2 py-3 text-white/40 hover:text-white text-sm transition-colors"
            >
              <UserCircle size={16} />
              Войти как гость
            </button>
          </div>
        </div>
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowTerms(false)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111111] border border-[#2a2a2a] rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
              <h3 className="text-white font-bold text-lg">Условия использования</h3>
              <button onClick={() => setShowTerms(false)} className="text-white/30 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4 text-white/50 text-sm">
              <p>BOFLAN — крипто-социальная платформа. Контент носит информационный характер и не является финансовым советом.</p>
            </div>
            <div className="px-6 py-4 border-t border-[#1a1a1a] flex gap-3">
              <button onClick={() => setShowTerms(false)} className="flex-1 py-2.5 bg-[#1a1a1a] text-white/50 hover:text-white rounded-lg text-sm">Закрыть</button>
              <button onClick={() => { setAgreedTerms(true); setShowTerms(false); }} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm">Принять</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Guest Warning Modal */}
      {showGuestWarning && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowGuestWarning(false)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111111] border border-[#2a2a2a] rounded-xl w-full max-w-md"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
              <h3 className="text-white font-bold text-lg">⚠️ Ограниченный доступ</h3>
              <button onClick={() => setShowGuestWarning(false)} className="text-white/30 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-white/80 text-sm">
                Вход как гость предоставляет ограниченный доступ к функциям платформы:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-red-400">✗</span>
                  <span className="text-white/60">Создание постов и комментариев</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400">✗</span>
                  <span className="text-white/60">Загрузка изображений</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400">✗</span>
                  <span className="text-white/60">Лайки и сохранение постов</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400">✗</span>
                  <span className="text-white/60">Создание групп и сообществ</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400">✗</span>
                  <span className="text-white/60">Персональные уведомления</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-white/60">Просмотр ленты и постов</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-white/60">Поиск пользователей</span>
                </div>
              </div>
              <p className="text-yellow-400 text-xs">
                💡 Рекомендуем зарегистрироваться для полного доступа ко всем функциям
              </p>
            </div>
            <div className="px-6 py-4 border-t border-[#1a1a1a] flex gap-3">
              <button onClick={() => setShowGuestWarning(false)} className="flex-1 py-2.5 bg-[#1a1a1a] text-white/50 hover:text-white rounded-lg text-sm">
                Назад
              </button>
              <button onClick={confirmGuestLogin} className="flex-1 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium text-sm">
                Продолжить как гость
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}