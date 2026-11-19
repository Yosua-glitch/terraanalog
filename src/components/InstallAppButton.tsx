import { useEffect, useRef, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { ThemeTokens } from '../types/theme';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafariLike(): boolean {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  return iOS;
}

interface InstallAppButtonProps {
  tokens: ThemeTokens;
}

/** Tombol "Install App": memakai prompt bawaan browser (Chrome/Edge/Android) atau petunjuk untuk iPhone/iPad. */
export function InstallAppButton({ tokens }: InstallAppButtonProps) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => isStandalone());
  const [showIosHelp, setShowIosHelp] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const ios = isIosSafariLike();

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!showIosHelp) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowIosHelp(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShowIosHelp(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showIosHelp]);

  if (installed || (!deferred && !ios)) return null;

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } else {
      setShowIosHelp((v) => !v);
    }
  };

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={onClick}
        data-testid="install-app-btn"
        aria-label="Install app"
        aria-expanded={deferred ? undefined : showIosHelp}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${tokens.secondaryButton}`}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install App</span>
      </button>
      {showIosHelp && (
        <div
          role="dialog"
          aria-label="How to install on iPhone or iPad"
          data-testid="install-ios-help"
          className={`absolute right-0 top-full mt-2 w-64 p-3 text-[11px] leading-relaxed z-[1080] shadow-2xl ${tokens.card} ${tokens.bodyText}`}
        >
          <div className="flex items-start justify-between gap-2">
            <span className={`font-semibold ${tokens.heading}`}>Install on iPhone / iPad</span>
            <button type="button" aria-label="Close" onClick={() => setShowIosHelp(false)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <ol className="mt-1.5 list-decimal pl-4 space-y-1">
            <li>
              Open this page in <b>Safari</b>.
            </li>
            <li>
              Tap the <Share className="inline w-3 h-3 -mt-0.5" /> <b>Share</b> button.
            </li>
            <li>
              Choose <b>Add to Home Screen</b>, then <b>Add</b>.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
