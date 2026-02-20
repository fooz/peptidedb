"use client";

import type { InputHTMLAttributes } from "react";
import { useState } from "react";

type PasswordInputProps = {
  name: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "type">;

export function PasswordInput({ name, ...inputProps }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input-wrap">
      <input name={name} type={visible ? "text" : "password"} {...inputProps} />
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
