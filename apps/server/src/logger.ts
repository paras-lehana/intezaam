/**
 * Structured logger — one JSON object per line.
 *
 * Responsibility: format log entries into JSON lines (`severity` + `message` + flat fields), the
 * shape `docker logs` and common log shippers parse from stdout. Boundary: the sink is injected,
 * so tests capture lines in memory and production writes to stdout; bodies are never logged.
 */

export type LogSeverity = 'INFO' | 'WARNING' | 'ERROR';

/** Flat, primitive-only fields keep entries queryable and stop objects (bodies) sneaking in. */
export type LogFields = Readonly<Record<string, string | number | boolean>>;

export interface Logger {
  log(severity: LogSeverity, message: string, fields?: LogFields): void;
}

/** Receives one serialised line (without the trailing newline). */
export type LogSink = (line: string) => void;

/**
 * Creates a logger that writes one JSON line per entry to `sink`.
 * @example
 * createJsonLogger((line) => lines.push(line)).log('INFO', 'started', { port: 8080 });
 */
export function createJsonLogger(sink: LogSink): Logger {
  return {
    log(severity, message, fields = {}) {
      sink(JSON.stringify({ ...fields, severity, message }));
    },
  };
}
