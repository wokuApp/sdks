import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { WidgetAppConfig } from '../config';
import type { WokuReviewData } from '../services/capture';
import { fetchWokuReview, fetchCompanyBranding, type CompanyBranding } from '../services/capture';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CaptureStep = 'qualifier' | 'feedback' | 'thank';

export interface WidgetContextType {
  config: WidgetAppConfig;
  step: CaptureStep;
  setStep: (step: CaptureStep) => void;

  // Woku-mode state
  qualification: number | undefined; // 1-5 for woku
  setQualification: (q: number | undefined) => void;
  wokuData: WokuReviewData | null;

  // NPS-mode state
  npsScore: number | undefined; // 0-10 for nps
  setNpsScore: (s: number | undefined) => void;
  npsId: string | undefined; // returned after POST /v1/nps
  setNpsId: (id: string | undefined) => void;

  // Shared feedback state
  textnote: string | undefined;
  setTextnote: (t: string | undefined) => void;
  email: string | undefined;
  setEmail: (e: string | undefined) => void;
  anonymous: boolean;
  setAnonymous: (a: boolean) => void;
  isInitialEmail: boolean;

  // Company branding
  branding: CompanyBranding;

  // Loading
  loading: boolean;
  error: string | undefined;

  // Reset the whole flow
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const WidgetContext = createContext<WidgetContextType | null>(null);

export function useWidgetContext(): WidgetContextType {
  const ctx = useContext(WidgetContext);
  if (!ctx) throw new Error('useWidgetContext must be used within WidgetProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface WidgetProviderProps {
  config: WidgetAppConfig;
  initialEmail?: string;
  children: ReactNode;
}

export function WidgetProvider({ config, initialEmail, children }: WidgetProviderProps) {
  const [step, setStep] = useState<CaptureStep>('qualifier');

  // Woku
  const [qualification, setQualification] = useState<number | undefined>(undefined);
  const [wokuData, setWokuData] = useState<WokuReviewData | null>(null);

  // NPS
  const [npsScore, setNpsScore] = useState<number | undefined>(undefined);
  const [npsId, setNpsId] = useState<string | undefined>(undefined);

  // Shared
  const [textnote, setTextnote] = useState<string | undefined>(undefined);
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [anonymous, setAnonymous] = useState<boolean>(false);
  const [isInitialEmail, setIsInitialEmail] = useState(false);

  // Loading / error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  // Branding
  const [branding, setBranding] = useState<CompanyBranding>({});

  // Apply initial email from config
  useEffect(() => {
    const emailToUse = initialEmail ?? config.email;
    if (emailToUse) {
      const regex = /^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/;
      if (regex.test(emailToUse)) {
        setEmail(emailToUse);
        setAnonymous(false);
        setIsInitialEmail(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch woku data (mode-specific)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(undefined);
      try {
        // Fetch company branding in parallel
        const [brandingData] = await Promise.all([
          fetchCompanyBranding(config.apiBaseUrl, config.publishableKey),
          config.captureType === 'woku' && config.wokuId
            ? fetchWokuReview(config.apiBaseUrl, config.publishableKey, config.wokuId).then(
                (data) => {
                  if (!cancelled) setWokuData(data);
                },
              )
            : Promise.resolve(),
        ]);
        if (!cancelled) setBranding(brandingData);
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
     
  }, [config.captureType, config.wokuId, config.apiBaseUrl, config.publishableKey]);

  const reset = () => {
    setStep('qualifier');
    setQualification(undefined);
    setNpsScore(undefined);
    setNpsId(undefined);
    setTextnote(undefined);
    setAnonymous(false);
    if (!isInitialEmail) setEmail(undefined);
  };

  const value: WidgetContextType = {
    config,
    step,
    setStep,
    qualification,
    setQualification,
    wokuData,
    npsScore,
    setNpsScore,
    npsId,
    setNpsId,
    textnote,
    setTextnote,
    email,
    setEmail,
    anonymous,
    setAnonymous,
    isInitialEmail,
    branding,
    loading,
    error,
    reset,
  };

  return <WidgetContext.Provider value={value}>{children}</WidgetContext.Provider>;
}

// Augment config type to include optional email (passed from loader)
declare module '../config' {
  interface WidgetAppConfig {
    email?: string;
  }
}
