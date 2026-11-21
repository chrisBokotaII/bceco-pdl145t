import React, { useState } from 'react';
import { AlertCircle, Building2, Lock, Mail, UserCheck, WifiOff } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import {
  APP_TITLE,
  DEMO_ACCOUNTS_DISPLAY,
  DEMO_BANNER_TEXT,
  INSTITUTION_REF,
} from '../../domain/constants';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { fadeUp, staggerContainer } from '../../motion/presets';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { ThemeSwitcher } from '../common/ThemeSwitcher';

export const LoginScreen: React.FC = () => {
  const { loginDemo, isOnline } = useApp();
  const reduced = usePrefersReducedMotion();
  const [email, setEmail] = useState('coordinateur.demo@pd145t.test');
  const [password, setPassword] = useState('Demo2026!');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginDemo(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de connexion.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickFill = (accEmail: string, accPassword: string) => {
    setEmail(accEmail);
    setPassword(accPassword);
    setError(null);
  };

  const handleQuickLogin = async (accEmail: string, accPassword: string) => {
    setEmail(accEmail);
    setPassword(accPassword);
    setError(null);
    setSubmitting(true);
    try {
      await loginDemo(accEmail, accPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de connexion.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-page flex flex-col">
      {/* Institutional Demonstration Notice */}
      <div className="bg-amber-50 border-b border-amber-200 px-3 sm:px-4 py-2 text-xs font-medium text-amber-950">
        <p className="text-center">{DEMO_BANNER_TEXT}</p>
      </div>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <motion.div
          className="w-full max-w-6xl bg-app-card border border-app-border rounded-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch shadow-sm"
          initial={reduced ? false : { opacity: 0, y: 16, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduced ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Left Institutional Panel */}
          <section className="lg:col-span-5 bg-app-sidebar text-white p-8 lg:p-10 flex flex-col justify-between">
            <motion.div
              className="space-y-6"
              variants={staggerContainer}
              initial={reduced ? false : 'hidden'}
              animate="show"
            >
              <motion.div variants={fadeUp} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-blue-600/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-blue-200" />
                </div>
                <div>
                  <p className="text-xs text-blue-200 font-medium tracking-wide">
                    République Démocratique du Congo
                  </p>
                  <p className="text-sm font-semibold text-white">{INSTITUTION_REF}</p>
                </div>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="text-2xl sm:text-3xl font-bold tracking-tight text-white [text-wrap:balance]"
              >
                {APP_TITLE}
              </motion.h1>
            </motion.div>

            <div className="pt-5 mt-8">
              <PWAInstallButton compact />
            </div>
          </section>

          {/* Right Authentication Panel */}
          <section className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
            <motion.div
              className="max-w-lg w-full mx-auto space-y-6"
              variants={staggerContainer}
              initial={reduced ? false : 'hidden'}
              animate="show"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-app-primary">Connexion à la plateforme</h2>
                  <p className="text-sm text-app-secondary mt-1">
                    Sélectionnez un compte de démonstration préconfiguré pour accéder à la plateforme.
                  </p>
                </div>
                <ThemeSwitcher variant="segmented" showLabel className="shrink-0" />
              </div>

              {!isOnline && (
                <div className="border border-amber-300 bg-amber-50 rounded-md p-3 flex items-start gap-2.5 text-xs text-amber-900">
                  <WifiOff className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                  <span>
                    Connexion réseau absente. Si vous avez déjà ouvert une session sur cet appareil,
                    rechargez ou reconnectez-vous pour synchroniser vos fiches locales.
                  </span>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="border border-red-300 bg-red-50 rounded-md p-3 flex items-start gap-2.5 text-xs text-red-800"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Isolated Demo Authentication Form */}
              <form onSubmit={handleDemoSubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Adaptateur de démonstration isolé (comptes fictifs)
                  </span>
                  <span className="text-xs text-slate-500">Contrôle RBAC actif</span>
                </div>

                <div>
                  <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Adresse e-mail professionnelle
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="coordinateur.demo@pd145t.test"
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-md bg-white text-slate-900 focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-md bg-white text-slate-900 focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-[#0F2544] text-white text-sm font-semibold rounded-md hover:bg-[#16325B] disabled:opacity-60 transition-colors min-h-[44px]"
                >
                  {submitting ? 'Authentification en cours…' : 'Se connecter (Mode Démonstration)'}
                </button>
              </form>

              {/* Quick-fill & Direct Access Demo Credentials */}
              <div className="border-t border-slate-200 pt-5 space-y-2.5">
                <p className="text-xs font-semibold text-slate-700">
                  Comptes de démonstration préconfigurés (mot de passe : <span className="font-mono">Demo2026!</span>)
                </p>
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-md">
                  {DEMO_ACCOUNTS_DISPLAY.map((acc) => {
                    const isSelected = email.toLowerCase() === acc.email.toLowerCase();
                    return (
                      <div
                        key={acc.email}
                        className={`px-3.5 py-2.5 transition-colors flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 ${
                          isSelected ? 'bg-blue-50/70' : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleQuickFill(acc.email, acc.passwordHint)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                            <UserCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                            <span className="truncate">{acc.label}</span>
                          </div>
                          <p className="text-xs font-mono text-slate-600 mt-0.5 truncate">{acc.email}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{acc.scope}</p>
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleQuickLogin(acc.email, acc.passwordHint)}
                          className="px-3 py-1.5 text-xs font-semibold text-[#0F2544] bg-white border border-slate-300 rounded-md hover:bg-slate-100 whitespace-nowrap shrink-0 min-h-[36px] disabled:opacity-50"
                        >
                          Accéder
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </section>
        </motion.div>
      </main>
    </div>
  );
};
