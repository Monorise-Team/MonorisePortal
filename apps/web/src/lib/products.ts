export const PRODUCT_LABELS: Record<string, string> = { timotime: "TimoTime", avenmail: "AvenMail" };

/** Nazwa aplikacji dla klucza produktu (nieznany klucz bez zmian). */
export const productLabel = (key: string): string => PRODUCT_LABELS[key] ?? key;
