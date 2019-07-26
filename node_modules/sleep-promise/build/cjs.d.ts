import { SleepOptions } from './shared';

declare namespace sleep {
    // Allow usage of a CJS module
}

declare function sleep<T = any>(
    timeout: number,
    options?: SleepOptions,
): Promise<T> & ((value: T) => T);

export = sleep;
