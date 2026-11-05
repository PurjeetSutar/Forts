import { useState } from "react";

export default function JsonEditor({ value, onChange, rows = 18, testid }) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [err, setErr] = useState("");
  return (
    <div>
      <textarea rows={rows} value={text} data-testid={testid} spellCheck={false}
        onChange={(e) => {
          setText(e.target.value);
          try { onChange(JSON.parse(e.target.value)); setErr(""); } catch (x) { setErr("Invalid JSON — fix before saving"); onChange(undefined); }
        }}
        className="w-full font-mono text-xs border border-stone-300 p-3 bg-stone-50 focus:outline-none focus:border-[#E87524]" />
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
    </div>
  );
}
