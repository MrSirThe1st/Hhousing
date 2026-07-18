import { Linking } from "react-native";

export async function openWhatsAppMessage(message: string, phoneE164?: string | null): Promise<void> {
  const encoded = encodeURIComponent(message);
  const digits = phoneE164?.replace(/\D/g, "") ?? "";

  const candidates = digits.length >= 9
    ? [
        `whatsapp://send?phone=${digits}&text=${encoded}`,
        `https://wa.me/${digits}?text=${encoded}`,
        `https://api.whatsapp.com/send?phone=${digits}&text=${encoded}`
      ]
    : [
        `whatsapp://send?text=${encoded}`,
        `https://wa.me/?text=${encoded}`,
        `https://api.whatsapp.com/send?text=${encoded}`
      ];

  for (const url of candidates) {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // try next candidate
    }
  }

  await Linking.openURL(candidates[candidates.length - 1]!);
}
