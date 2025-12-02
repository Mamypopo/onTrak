"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TabletsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard
    router.replace("/dashboard");
  }, [router]);

  return null;
}
