import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { WidgetAppConfig } from '../config';
import type {
  NpsToolData,
  ScaleToolData,
  WokuReviewData,
} from '../services/capture';
import {
  fetchWokuReview,
  fetchCompanyBranding,
  fetchNpsTool,
  fetchScaleTool,
  type CompanyBranding,
} from '../services/capture';
import { resolveLocale } from '../i18n';

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
  npsTool: NpsToolData | null; // the tool's subject and audience, when known

  // CES / CSAT-mode state (1-5)
  scaleScore: number | undefined;
  setScaleScore: (s: number | undefined) => void;
  scaleTool: ScaleToolData | null;
  scaleResponseId: string | undefined;
  setScaleResponseId: (id: string | undefined) => void;

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
  if (!ctx)
    throw new Error('useWidgetContext must be used within WidgetProvider');
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

export function WidgetProvider({
  config,
  initialEmail,
  children,
}: WidgetProviderProps) {
  const [step, setStep] = useState<CaptureStep>('qualifier');

  // Woku
  const [qualification, setQualification] = useState<number | undefined>(
    undefined,
  );
  const [wokuData, setWokuData] = useState<WokuReviewData | null>(null);

  // NPS
  const [npsScore, setNpsScore] = useState<number | undefined>(undefined);
  const [npsId, setNpsId] = useState<string | undefined>(undefined);
  const [npsTool, setNpsTool] = useState<NpsToolData | null>(null);

  // CES / CSAT
  const [scaleScore, setScaleScore] = useState<number | undefined>(undefined);
  const [scaleTool, setScaleTool] = useState<ScaleToolData | null>(null);
  const [scaleResponseId, setScaleResponseId] = useState<string | undefined>(
    undefined,
  );

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
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
        const locale = resolveLocale(config.lang);
        const scaleToolId =
          config.captureType === 'ces'
            ? config.cesToolId
            : config.captureType === 'csat'
              ? config.csatToolId
              : undefined;
        const [brandingData] = await Promise.all([
          fetchCompanyBranding(config.apiBaseUrl, config.publishableKey),
          config.captureType === 'woku' && config.wokuId
            ? fetchWokuReview(
                config.apiBaseUrl,
                config.publishableKey,
                config.wokuId,
              ).then((data) => {
                if (!cancelled) setWokuData(data);
              })
            : Promise.resolve(),
          (config.captureType === 'ces' || config.captureType === 'csat') &&
          scaleToolId
            ? fetchScaleTool(
                config.captureType,
                config.apiBaseUrl,
                config.publishableKey,
                scaleToolId,
                locale,
              ).then((data) => {
                if (!cancelled) setScaleTool(data);
              })
            : Promise.resolve(),
          config.captureType === 'nps' && config.npsToolId
            ? fetchNpsTool(
                config.apiBaseUrl,
                config.publishableKey,
                config.npsToolId,
                locale,
              )
                .then((data) => {
                  if (!cancelled) setNpsTool(data);
                })
                // The generic question still works without the tool copy.
                .catch(() => undefined)
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
  }, [
    config.captureType,
    config.wokuId,
    config.npsToolId,
    config.cesToolId,
    config.csatToolId,
    config.lang,
    config.apiBaseUrl,
    config.publishableKey,
  ]);

  const reset = () => {
    setStep('qualifier');
    setQualification(undefined);
    setNpsScore(undefined);
    setNpsId(undefined);
    setScaleScore(undefined);
    setScaleResponseId(undefined);
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
    npsTool,
    scaleScore,
    setScaleScore,
    scaleTool,
    scaleResponseId,
    setScaleResponseId,
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

  return (
    <WidgetContext.Provider value={value}>{children}</WidgetContext.Provider>
  );
}

// Augment config type to include optional email (passed from loader)
declare module '../config' {
  interface WidgetAppConfig {
    email?: string;
  }
}
