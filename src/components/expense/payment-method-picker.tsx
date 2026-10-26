"use client";

import {
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@/types/expense";

type PaymentMethodPickerProps = {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
};

export function PaymentMethodPicker({
  value,
  onChange,
}: PaymentMethodPickerProps) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-700">支払方法</p>
      <div className="grid grid-cols-3 gap-2">
        {PAYMENT_METHODS.map((method) => {
          const selected = value === method.id;
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onChange(method.id)}
              className={`rounded-xl border py-2.5 text-sm font-semibold transition ${
                selected
                  ? "border-teal-600 bg-teal-50 text-teal-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {method.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
