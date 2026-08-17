"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function HeaderAccountNav() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/account/commerce", { cache: "no-store" });
        if (res.ok) {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      } catch {
        setIsLoggedIn(false);
      }
    }
    void checkAuth();
  }, []);

  if (isLoggedIn === true) {
    return (
      <>
        <Link
          href="/account/orders"
          className="transition hover:text-ink font-medium text-ink"
        >
          Orders
        </Link>
        <Link
          href="/account"
          className="transition hover:text-ink font-medium text-ink flex items-center gap-1.5"
        >
          <span>Account</span>
        </Link>
      </>
    );
  }

  return (
    <Link href="/account/login" className="transition hover:text-ink">
      Sign in
    </Link>
  );
}
