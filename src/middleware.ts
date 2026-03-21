export { auth as middleware } from "@/features/auth/lib/auth";

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|invite|reset-password).*)"],
};
