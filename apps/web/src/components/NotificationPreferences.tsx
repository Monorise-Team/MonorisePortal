"use client";

import { Banner, Button, Card, CardHeader, CardTitle, EmptyState, SettingToggleRow } from "@monorise-team/ui";
import { useMemo, useState } from "react";
import {
  LOCKED_NOTIFICATION_NOTE,
  applyNotificationPreferenceUpdate,
  groupNotificationPreferences,
  isLockedNotificationPreference,
  toggleNotificationPreference,
  type NotificationPreference,
  type NotificationToggleFeedback,
} from "@/lib/notifications";

interface NotificationPreferencesProps {
  initialPreferences: NotificationPreference[];
  initialFeedback?: NotificationToggleFeedback | null;
}

/**
 * Lista ustawień powiadomień e-mail z podziałem na produkty oraz konto i bezpieczeństwo.
 * Z JavaScriptem przełączniki zapisują zmianę przez `PUT`; bez JavaScriptu każdy opcjonalny wiersz
 * udostępnia formularz `POST` na tę samą trasę BFF.
 */
export function NotificationPreferences({ initialPreferences, initialFeedback = null }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreference[]>(initialPreferences);
  const [pendingCategories, setPendingCategories] = useState<ReadonlySet<string>>(() => new Set());
  const [feedback, setFeedback] = useState<NotificationToggleFeedback | null>(initialFeedback);

  const groups = useMemo(() => groupNotificationPreferences(preferences), [preferences]);

  async function handleToggle(item: NotificationPreference, nextEnabled: boolean) {
    if (isLockedNotificationPreference(item) || pendingCategories.has(item.category)) return;

    setPendingCategories((prev) => {
      const next = new Set(prev);
      next.add(item.category);
      return next;
    });
    setFeedback(null);

    const outcome = await toggleNotificationPreference(item.category, nextEnabled);

    setPendingCategories((prev) => {
      const next = new Set(prev);
      next.delete(item.category);
      return next;
    });

    if (!outcome.ok) {
      if (outcome.unauthenticated) {
        window.location.assign("/api/auth/sign-in?returnTo=/notifications");
        return;
      }
      setFeedback({ tone: "danger", message: outcome.message });
      return;
    }

    setPreferences((prev) => applyNotificationPreferenceUpdate(prev, outcome.preference));
    setFeedback({ tone: "success", message: outcome.message });
  }

  return (
    <>
      {feedback && <Banner tone={feedback.tone} message={feedback.message} />}

      {groups.length === 0 ? (
        <Card className="p-4">
          <EmptyState
            title="Brak ustawień powiadomień"
            description="Twoja firma nie ma jeszcze aktywnych kategorii powiadomień do ustawienia."
          />
        </Card>
      ) : (
        groups.map((group) => (
          <Card key={group.id} className="p-4">
            <CardHeader>
              <CardTitle>{group.label}</CardTitle>
            </CardHeader>
            <ul className="divide-y divide-border-primary">
              {group.items.map((item) => {
                const locked = isLockedNotificationPreference(item);
                const pending = pendingCategories.has(item.category);

                if (locked) {
                  return (
                    <li key={item.category} className="py-3">
                      <SettingToggleRow
                        label={item.name}
                        description={
                          <>
                            <span className="block">{item.description}</span>
                            <span className="mt-1 block text-text-secondary">{LOCKED_NOTIFICATION_NOTE}</span>
                          </>
                        }
                        checked
                        disabled
                      />
                    </li>
                  );
                }

                return (
                  <li key={item.category} className="py-3">
                    <form
                      method="post"
                      action={`/api/notifications/${encodeURIComponent(item.category)}`}
                      className="flex flex-col gap-2"
                    >
                      <input type="hidden" name="enabled" value={item.enabled ? "false" : "true"} />
                      <SettingToggleRow
                        label={item.name}
                        description={item.description}
                        checked={item.enabled}
                        disabled={pending}
                        aria-busy={pending || undefined}
                        onCheckedChange={(checked) => {
                          void handleToggle(item, checked);
                        }}
                      />
                      <noscript>
                        <div className="flex justify-end">
                          <Button type="submit" variant="outline" size="sm">
                            {item.enabled ? "Wyłącz" : "Włącz"}
                            <span className="sr-only"> {item.name}</span>
                          </Button>
                        </div>
                      </noscript>
                    </form>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))
      )}
    </>
  );
}
