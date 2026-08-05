"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const DEFAULT_PROPERTY_ID = "6a732b3e2502921d483ec339";
const DEFAULT_WIDGET_ID = "1jv8u1rsu";

/**
 * Loads Tawk.to on public + operator surfaces.
 * Hidden on /admin — platform ops use the Tawk dashboard, not the widget.
 */
export default function TawkToWidget(): React.ReactElement | null {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  const propertyId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID?.trim() || DEFAULT_PROPERTY_ID;
  const widgetId = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID?.trim() || DEFAULT_WIDGET_ID;
  const src = `https://embed.tawk.to/${propertyId}/${widgetId}`;

  return (
    <Script id="tawk-to" strategy="afterInteractive">{`
var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
  var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
  s1.async=true;
  s1.src='${src}';
  s1.charset='UTF-8';
  s1.setAttribute('crossorigin','*');
  s0.parentNode.insertBefore(s1,s0);
})();
    `}</Script>
  );
}
