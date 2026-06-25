import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API認証ルートは常に許可
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  // 静的ファイルは許可
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  // セッションCookieをチェック（NextAuth のセッションCookie名）
  const sessionToken =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token");

  const isLoggedIn = !!sessionToken;
  const isLoginPage = pathname === "/login";

  // 未ログインでログイン以外のページにアクセス → ログインページへ
  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ログイン済みでログインページ → ダッシュボードへ
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
