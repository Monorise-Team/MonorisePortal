import { CardHeader, CardTitle } from "@monorise-team/ui";
import { AppearanceSettings } from "@/components/AppearanceSettings";

/** Wygląd: motyw, tryb, tło z doliną, przyciemnienie i rozmycie, skala tekstu, gęstość (zapis w przeglądarce). */
export default function SettingsPage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-text-primary">Wygląd</h1>
      <p className="text-sm text-text-secondary">
        Ustawienia zapisują się w tej przeglądarce i działają od razu, także w innych aplikacjach Monorise na tym samym
        adresie.
      </p>
      <section className="flex flex-col gap-3">
        <CardHeader>
          <CardTitle>Motyw i tło</CardTitle>
        </CardHeader>
        <AppearanceSettings />
      </section>
    </>
  );
}
