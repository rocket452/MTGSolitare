import { useEffect } from "react";

const ADSENSE_CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID;
const ADSENSE_MOBILE_SLOT_ID = import.meta.env.VITE_ADSENSE_MOBILE_SLOT_ID;
const ADSENSE_SCRIPT_ID = "adsense-script";
const isAdsenseConfigured = Boolean(ADSENSE_CLIENT_ID && ADSENSE_MOBILE_SLOT_ID);

export const shouldShowMobileAdSlot =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_ADS === "true" || isAdsenseConfigured;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function MobileAdSlot() {
  useEffect(() => {
    if (!isAdsenseConfigured) {
      return;
    }

    if (!document.getElementById(ADSENSE_SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = ADSENSE_SCRIPT_ID;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
      document.head.appendChild(script);
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blockers or duplicate fills should not break the play surface.
    }
  }, []);

  if (!shouldShowMobileAdSlot) {
    return null;
  }

  return (
    <aside className="mobile-ad-slot" aria-label="Advertisement">
      {isAdsenseConfigured ? (
        <ins
          className="adsbygoogle mobile-ad-unit"
          data-ad-client={ADSENSE_CLIENT_ID}
          data-ad-slot={ADSENSE_MOBILE_SLOT_ID}
          data-ad-format="horizontal"
          data-full-width-responsive="true"
        />
      ) : (
        <div className="mobile-ad-placeholder">Advertisement</div>
      )}
    </aside>
  );
}
