import { getAuth } from "@/server/auth";

export const dynamic = "force-dynamic";

/** Wylogowanie (tylko POST z adresu Portalu); unieważnia token odświeżania w Core i czyści ciasteczko. */
export const POST = (request: Request) => getAuth().signOut(request);
