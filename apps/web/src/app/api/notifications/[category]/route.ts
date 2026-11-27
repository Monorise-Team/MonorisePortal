import { randomUUID } from "node:crypto";
import { AuthError } from "@monorise-team/auth";
import { CoreApiError, CoreApiUnavailableError } from "@monorise-team/sdk";
import {
  notificationErrorMessage,
  parseEnabledFormValue,
  parseEnabledJsonBody,
  parseNotificationCategory,
} from "@/lib/notifications";
import { getAuth } from "@/server/auth";
import { coreFor } from "@/server/core";
import { InvalidForm, formAction } from "@/server/form";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

function requestIdFor(request: Request): string {
  const incoming = request.headers.get("x-request-id");
  return incoming && /^[\w-]{1,64}$/.test(incoming) ? incoming : `req_${randomUUID().slice(0, 12)}`;
}

function jsonError(request: Request, status: number, code: string, message: string, details: readonly unknown[] = []) {
  return Response.json(
    { data: null, meta: { requestId: requestIdFor(request) }, error: { code, message, details } },
    { status, headers: NO_STORE_HEADERS },
  );
}

/** Zmiana ustawienia kategorii powiadomień przez formularz HTML bez JavaScriptu (`POST` -> `303`). */
export const POST = async (request: Request, { params }: { params: Promise<{ category: string }> }) => {
  const { category } = await params;
  return formAction("/notifications", async ({ core, form }) => {
    const validCategory = parseNotificationCategory(category);
    if (!validCategory) throw new InvalidForm("category");
    const enabled = parseEnabledFormValue(form.get("enabled"));
    if (enabled === null) throw new InvalidForm("enabled");
    await core.updateMyNotificationPreference({ path: { category: validCategory }, body: { enabled } });
    return { ok: enabled ? "notification-enabled" : "notification-disabled" };
  })(request);
};

/** Zmiana ustawienia kategorii powiadomień przez przełącznik w przeglądarce (`PUT`, JSON `{ data, meta, error }`). */
export const PUT = async (request: Request, { params }: { params: Promise<{ category: string }> }) => {
  const { category } = await params;
  return getAuth().withAuth(
    request,
    async (auth) => {
      if (auth.via !== "session") {
        throw new AuthError("UNAUTHENTICATED", "Ustawienia powiadomień wymagają sesji Portalu.");
      }

      const validCategory = parseNotificationCategory(category);
      if (!validCategory) {
        return jsonError(request, 422, "VALIDATION_FAILED", "Nieprawidłowa kategoria powiadomień.");
      }

      let rawBody: unknown;
      try {
        rawBody = await request.json();
      } catch {
        return jsonError(request, 422, "VALIDATION_FAILED", "Wybierz, czy włączyć powiadomienia w tej kategorii.");
      }

      const enabled = parseEnabledJsonBody(rawBody);
      if (enabled === null) {
        return jsonError(request, 422, "VALIDATION_FAILED", "Wybierz, czy włączyć powiadomienia w tej kategorii.");
      }

      try {
        const updated = await coreFor(auth.session).updateMyNotificationPreference({
          path: { category: validCategory },
          body: { enabled },
        });
        return Response.json(
          { data: updated, meta: { requestId: requestIdFor(request) }, error: null },
          { status: 200, headers: NO_STORE_HEADERS },
        );
      } catch (error) {
        if (error instanceof CoreApiError) {
          return jsonError(
            request,
            error.status,
            error.code,
            notificationErrorMessage(error.code, error.message),
            error.details,
          );
        }
        if (error instanceof CoreApiUnavailableError) {
          return jsonError(request, 503, "UNAVAILABLE", notificationErrorMessage("UNAVAILABLE"));
        }
        throw error;
      }
    },
    {
      onError: (error) => {
        if (error instanceof AuthError) {
          return jsonError(request, error.statusCode, error.code, error.message);
        }
        return jsonError(request, 503, "UNAVAILABLE", notificationErrorMessage("UNAVAILABLE"));
      },
    },
  );
};
