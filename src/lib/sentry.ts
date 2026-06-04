interface ErrorReporter {
  captureException(error: Error, context?: Record<string, unknown>): void;
  captureMessage(
    message: string,
    level?: "info" | "warning" | "error",
  ): void;
  setUser(user: { id?: string; email?: string } | null): void;
}

const consoleReporter: ErrorReporter = {
  captureException(error, context) {
    console.error("[Error]", error, context);
  },
  captureMessage(message, level = "info") {
    const fn =
      level === "error"
        ? console.error
        : level === "warning"
          ? console.warn
          : console.log;
    fn(`[${level.toUpperCase()}]`, message);
  },
  setUser() {
    /* noop in console mode */
  },
};

let reporter: ErrorReporter = consoleReporter;

export function initErrorReporter(r: ErrorReporter) {
  reporter = r;
}

export function captureException(
  error: Error,
  context?: Record<string, unknown>,
) {
  reporter.captureException(error, context);
}

export function captureMessage(
  message: string,
  level?: "info" | "warning" | "error",
) {
  reporter.captureMessage(message, level);
}
