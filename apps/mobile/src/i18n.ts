import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { messages } from "@tzdraft/translations";
import * as SecureStore from "expo-secure-store";

const LANGUAGE_KEY = "user-language";

// Function to persist language choice
export const changeLanguage = async (lng: string) => {
  await i18n.changeLanguage(lng);
  await SecureStore.setItemAsync(LANGUAGE_KEY, lng);
};

// Initial setup with potential persistence load
const initI18n = async () => {
  const savedLanguage = await SecureStore.getItemAsync(LANGUAGE_KEY);
  
  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: messages.en },
        sw: { translation: messages.sw },
      },
      lng: savedLanguage || "en",
      fallbackLng: "en",
      interpolation: {
        escapeValue: false,
      },
    });
};

initI18n();

export default i18n;
