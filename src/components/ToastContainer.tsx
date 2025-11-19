/**
 * Toast Container Component
 * Manages and displays multiple toast notifications
 */

import { Toast, ToastProps } from "./Toast";
import styles from "./ToastContainer.module.css";

export interface ToastData {
  id: string;
  type: ToastProps["type"];
  message: string;
  duration?: number;
}

export interface ToastContainerProps {
  toasts: ToastData[];
  onClose: (id: string) => void;
  position?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "top-center"
    | "bottom-center";
}

/**
 * Container for displaying multiple toasts
 */
export function ToastContainer({
  toasts,
  onClose,
  position = "top-right",
}: ToastContainerProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className={`${styles.toastContainer} ${styles[position]}`}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={onClose}
        />
      ))}
    </div>
  );
}
