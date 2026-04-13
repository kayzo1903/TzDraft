import en from "./en.json";
import sw from "./sw.json";

export const messages = {
  en,
  sw,
};

export type Locale = keyof typeof messages;
export const locales: Locale[] = ["en", "sw"];

export default messages;
