import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as Tooltip from "@radix-ui/react-tooltip";
export function ConfidenceTag({ confidence, children }) {
    if (confidence === "high")
        return _jsx(_Fragment, { children: children });
    return (_jsx(Tooltip.Provider, { delayDuration: 200, children: _jsxs(Tooltip.Root, { children: [_jsx(Tooltip.Trigger, { asChild: true, children: _jsx("span", { className: "bg-yellow-100 border border-yellow-300 rounded px-1 cursor-help", children: children }) }), _jsx(Tooltip.Portal, { children: _jsxs(Tooltip.Content, { className: "bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg max-w-xs z-50", sideOffset: 4, children: ["Uncertain \u2014 please verify", _jsx(Tooltip.Arrow, { className: "fill-gray-900" })] }) })] }) }));
}
