"use client";

import { useState } from "react";

type PasswordInputProps = {
  name: string;
  autoComplete?: string;
};

export function PasswordInput({ name, autoComplete }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input-wrap">
      <input name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} />
      <button
        type="button"
        className="btn password-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
