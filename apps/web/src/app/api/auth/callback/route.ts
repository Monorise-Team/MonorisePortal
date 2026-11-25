import { getAuth } from "@/server/auth";

export const dynamic = "force-dynamic";

/** Powrót z Core z kodem: zaszyfrowane ciasteczko sesji i powrót pod `returnTo`. */
export const GET = (request: Request) => getAuth().callback(request);
