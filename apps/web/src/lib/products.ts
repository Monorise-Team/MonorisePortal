export const PRODUCT_LABELS: Record<string, string> = {
  avenmail: "AvenMail",
  kivotasks: "KivoTasks",
  timotime: "TimoTime",
};

/** Nazwa aplikacji dla klucza produktu (nieznany klucz bez zmian). */
export const productLabel = (key: string): string => PRODUCT_LABELS[key] ?? key;
