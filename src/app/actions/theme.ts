"use server";

import { cookies } from "next/headers";

type Theme = "light" | "dark";

const THEME_COOKIE = "notes-theme";
const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export async function setThemeCookie(theme: Theme) {
  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: THEME_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
  });
}
