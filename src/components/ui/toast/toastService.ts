// src/components/ui/toast/toastService.ts

let showToastFn: ((msg: string, type: "success" | "error") => void) | null = null;

export const registerToast = (fn: typeof showToastFn) => {
	showToastFn = fn;
};

export const showSuccessToast = (msg: string) => {
	showToastFn?.(msg, "success");
};

export const showErrorToast = (msg: string) => {
	showToastFn?.(msg, "error");
};
