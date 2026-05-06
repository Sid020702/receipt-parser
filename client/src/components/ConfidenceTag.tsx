import * as Tooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import type { Confidence } from "../lib/api";

interface Props {
  confidence: Confidence;
  children: ReactNode;
}

export function ConfidenceTag({ confidence, children }: Props) {
  if (confidence === "high") return <>{children}</>;
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span className="bg-yellow-100 border border-yellow-300 rounded px-1 cursor-help">
            {children}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg max-w-xs z-50"
            sideOffset={4}
          >
            Uncertain — please verify
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
