import { Banner } from "@monorise-team/ui";
import { readNotice } from "@/components/Notice";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { LOAD_MESSAGES, messageFor } from "@/lib/messages";
import { load, requirePageSession } from "@/server/page";

interface Props {
  searchParams: Promise<{ ok?: string; error?: string }>;
}

/** Powiadomienia e-mail zalogowanej osoby w bieżącej firmie (kategorie z Core API). */
export default async function NotificationsPage({ searchParams }: Props) {
  const { ok, error } = await searchParams;
  const { core } = await requirePageSession();
  const [preferences, initialFeedback] = await Promise.all([
    load(() => core.listMyNotificationPreferences()),
    readNotice(ok, error),
  ]);

  return (
    <>
      <h1 className="text-xl font-semibold text-text-primary">Powiadomienia</h1>
      <p className="text-sm text-text-secondary">
        Wybierz, które wiadomości e-mail z aplikacji Monorise chcesz dostawać. Zmiany dotyczą tylko Twojego konta w tej
        firmie.
      </p>

      {!preferences.ok ? (
        <Banner tone="danger" message={messageFor(LOAD_MESSAGES, preferences.code) ?? preferences.code} />
      ) : (
        <NotificationPreferences initialPreferences={preferences.data} initialFeedback={initialFeedback} />
      )}
    </>
  );
}
