"use client";

import dynamic from "next/dynamic";

const BibleBubble = dynamic(
  () => import("@/features/bible-reader/components/BibleBubble").then(m => m.BibleBubble),
  { ssr: false }
);

export function BibleBubbleWrapper() {
  return <BibleBubble />;
}
