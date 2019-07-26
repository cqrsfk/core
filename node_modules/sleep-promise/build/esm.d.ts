import { SleepOptions } from './shared';

declare function sleep<T = any>(
    timeout: number,
    options?: SleepOptions,
): Promise<T> & ((value: T) => T);

export default sleep;
