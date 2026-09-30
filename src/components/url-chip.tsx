"use client";

import { useState } from "react";
import { LinkSimple } from "@/components/icons";

export function UrlChip({ url }: { url: string }) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  let hostname = url;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // url이 이상해도 그냥 원문을 보여준다.
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="flex h-6 w-fit max-w-full items-center gap-1.5 rounded-md bg-black/[0.05] pl-1.5 pr-2 text-[12px] text-foreground/75 transition-colors hover:bg-black/[0.09]"
    >
      {faviconFailed ? (
        <LinkSimple weight="bold" className="size-3.5 shrink-0" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://www.google.com/s2/favicons?sz=64&domain=${hostname}`}
          alt=""
          className="size-3.5 shrink-0 rounded-[3px]"
          onError={() => setFaviconFailed(true)}
        />
      )}
      <span className="truncate">{hostname}</span>
    </a>
  );
}
