import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  LOG = 'log',
  DEBUG = 'debug',
}

@Injectable()
export class LoggerService implements NestLoggerService {
  private context?: string;

  setContext(context: string): void {
    this.context = context;
  }

  error(message: string, trace?: string, context?: string): void {
    this.log(LogLevel.ERROR, message, context, trace);
  }

  warn(message: string, context?: string): void {
    this.log(LogLevel.WARN, message, context);
  }

  log(message: string, context?: string): void {
    this.log(LogLevel.LOG, message, context);
  }

  debug(message: string, context?: string): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  private log(level: LogLevel, message: string, context?: string, trace?: string): void {
    const ctx = context || this.context || 'Application';
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${ctx}] ${message}`;
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(logMessage);
        if (trace) {
          console.error(trace);
        }
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.DEBUG:

        if (process.env.NODE_ENV !== 'production') {
          console.debug(logMessage);
        }
        break;
      default:
        console.log(logMessage);
    }
  }
}
